import { google } from 'googleapis';
import ical from 'node-ical';
import axios from 'axios';
import Property from '../../models/properties.model';
import Booking from '../../models/booking.model';
import { logger } from '../../utils/logger';


class CalendarSyncService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  async syncPropertyCalendars(propertyId) {
    try {
      const property = await Property.findById(propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      const syncPromises = [];

      // Sync Google Calendar if connected
      if (property.calendarSync.googleCalendarId) {
        syncPromises.push(this.syncGoogleCalendar(property));
      }

      // Sync iCal feeds
      if (property.calendarSync.icalUrls?.length > 0) {
        syncPromises.push(this.syncICalFeeds(property));
      }

      await Promise.all(syncPromises);

      // Update last sync timestamp
      property.calendarSync.lastSynced = new Date();
      await property.save();

      return true;
    } catch (error) {
      logger.error('Calendar sync failed:', error);
      throw error;
    }
  }

  async syncGoogleCalendar(property) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      // Get events from Google Calendar
      const response = await calendar.events.list({
        calendarId: property.calendarSync.googleCalendarId,
        timeMin: new Date().toISOString(),
        timeMax: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items;
      await this.processExternalEvents(property, events, 'google_calendar');

    } catch (error) {
      logger.error('Google Calendar sync failed:', error);
      throw error;
    }
  }

  async syncICalFeeds(property) {
    try {
      const events = [];

      for (const icalUrl of property.calendarSync.icalUrls) {
        try {
          const response = await axios.get(icalUrl);
          const parsedEvents = await ical.async.parseICS(response.data);
          
          Object.values(parsedEvents)
            .filter(event => event.type === 'VEVENT')
            .forEach(event => {
              events.push({
                start: event.start,
                end: event.end,
                summary: event.summary,
                description: event.description,
                source: icalUrl
              });
            });
        } catch (error) {
          logger.error(`iCal feed sync failed for URL ${icalUrl}:`, error);
        }
      }

      await this.processExternalEvents(property, events, 'ical');

    } catch (error) {
      logger.error('iCal feeds sync failed:', error);
      throw error;
    }
  }

  async processExternalEvents(property, events, source) {
    const blockDates = [];

    for (const event of events) {
      const startDate = new Date(source === 'google_calendar' ? event.start.dateTime || event.start.date : event.start);
      const endDate = new Date(source === 'google_calendar' ? event.end.dateTime || event.end.date : event.end);

      // Skip past events
      if (endDate < new Date()) continue;

      blockDates.push({
        startDate,
        endDate,
        reason: `External booking from ${source}`,
        source: {
          type: source,
          eventId: source === 'google_calendar' ? event.id : undefined,
          url: source === 'ical' ? event.source : undefined
        }
      });
    }

    // Update property availability
    await this.updatePropertyAvailability(property, blockDates);
  }

  async updatePropertyAvailability(property, blockDates) {
    const calendar = property.availability.calendar || [];

    for (const block of blockDates) {
      let currentDate = new Date(block.startDate);
      
      while (currentDate < block.endDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Find or create calendar entry
        let calendarEntry = calendar.find(entry => 
          entry.date.toISOString().split('T')[0] === dateString
        );

        if (!calendarEntry) {
          calendarEntry = {
            date: currentDate,
            isBlocked: true,
            source: block.source
          };
          calendar.push(calendarEntry);
        } else {
          calendarEntry.isBlocked = true;
          calendarEntry.source = block.source;
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    property.availability.calendar = calendar;
    await property.save();
  }

  async exportBookingsToGoogleCalendar(property) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      // Get all future bookings
      const bookings = await Booking.find({
        property: property._id,
        checkOut: { $gte: new Date() },
        status: { $in: ['CONFIRMED', 'checked_in'] }
      }).populate('guest', 'profile.name');

      for (const booking of bookings) {
        // Create or update event
        const event = {
          summary: `Booking: ${booking.guest.profile.name}`,
          description: `Booking ID: ${booking._id}\nGuests: ${booking.guests.adults + (booking.guests.children || 0)}`,
          start: {
            dateTime: booking.checkIn.toISOString(),
            timeZone: 'UTC'
          },
          end: {
            dateTime: booking.checkOut.toISOString(),
            timeZone: 'UTC'
          },
          extendedProperties: {
            private: {
              bookingId: booking._id.toString()
            }
          }
        };

        if (booking.googleEventId) {
          // Update existing event
          await calendar.events.update({
            calendarId: property.calendarSync.googleCalendarId,
            eventId: booking.googleEventId,
            resource: event
          });
        } else {
          // Create new event
          const createdEvent = await calendar.events.insert({
            calendarId: property.calendarSync.googleCalendarId,
            resource: event
          });

          // Save Google Calendar event ID
          booking.googleEventId = createdEvent.data.id;
          await booking.save();
        }
      }
    } catch (error) {
      logger.error('Export to Google Calendar failed:', error);
      throw error;
    }
  }

  async generateICalFeed(property) {
    try {
      const bookings = await Booking.find({
        property: property._id,
        checkOut: { $gte: new Date() },
        status: { $in: ['confirmed', 'checked_in'] }
      }).populate('guest', 'profile.name');

      let icalContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Your App//EN',
        `X-WR-CALNAME:${property.title}`,
      ];

      for (const booking of bookings) {
        icalContent = icalContent.concat([
          'BEGIN:VEVENT',
          `UID:${booking._id}`,
          `DTSTAMP:${this.formatDate(new Date())}`,
          `DTSTART:${this.formatDate(booking.checkIn)}`,
          `DTEND:${this.formatDate(booking.checkOut)}`,
          `SUMMARY:Booking: ${booking.guest.profile.name}`,
          `DESCRIPTION:Booking ID: ${booking._id}\\nGuests: ${booking.guests.adults + (booking.guests.children || 0)}`,
          'END:VEVENT'
        ]);
      }

      icalContent.push('END:VCALENDAR');
      return icalContent.join('\r\n');
    } catch (error) {
      logger.error('iCal feed generation failed:', error);
      throw error;
    }
  }

  formatDate(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
}

export default new CalendarSyncService();