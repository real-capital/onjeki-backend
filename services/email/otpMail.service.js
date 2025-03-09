import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import UserModel from '../../models/user.model.js';
import { format } from 'date-fns';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';
import { fileURLToPath } from 'url';
import PropertyModel from '../../models/properties.model.js';
import HttpException from '../../utils/exception.js';
import { logger } from '../../utils/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_SERVICE,
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendOtp(email, otp) {
    const mailOptions = {
      from: 'noreply@onjeki.gmail.com',
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${otp}. It will expire in 2 minutes.`,
    };
    await this.transporter.sendMail(mailOptions);
  }

  async sendBookingRequestEmail(booking) {
    const host = await UserModel.findById(booking.host);
    const guest = await UserModel.findById(booking.guest);
    const property = await PropertyModel.findById(booking.property);
    const template = await this.getEmailTemplate('booking-request', {
      hostName: host.name,
      propertyTitle: property.title,
      checkIn: format(booking.checkIn, 'MMM d, yyyy'),
      checkOut: format(booking.checkOut, 'MMM d, yyyy'),
      guestName: guest.name,
      guests: `${booking.guests.adults} adults${
        booking.guests.children ? `, ${booking.guests.children} children` : ''
      }`,
      amount: formatCurrency(booking.pricing.total, booking.pricing.currency),
      actionUrl: `${process.env.HOST_DASHBOARD_URL}/bookings/${booking._id}`,
    });

    await this.transporter.sendMail({
      from: `"Onjeki" <${process.env.MAIL_USER}>`,
      to: host.email,
      subject: 'New Booking Request',
      html: template,
    });
  }
  async sendBookingConfirmationEmail(booking) {
    // const guest = await UserModel.findById(booking.guest);
    // const template = await this.getEmailTemplate('booking-confirmation', {
    //   guestName: guest.name,
    //   propertyTitle: booking.property.title,
    //   checkIn: format(booking.checkIn, 'MMM d, yyyy'),
    //   checkOut: format(booking.checkOut, 'MMM d, yyyy'),
    //   guests: `${booking.guests.adults} adults${
    //     booking.guests.children ? `, ${booking.guests.children} children` : ''
    //   }`,
    //   amount: formatCurrency(booking.pricing.total, booking.pricing.currency),
    //   bookingId: booking._id,
    //   propertyAddress: booking.property.location.address,
    //   hostName: booking.host.name,
    //   hostPhone: booking.host.phoneNumber,
    //   actionUrl: `${process.env.APP_URL}/bookings/${booking._id}`,
    // });

    // await this.transporter.sendMail({
    //   from: `"Onjeki" <${process.env.MAIL_USER}>`,
    //   to: guest.email,
    //   subject: 'Booking Confirmation',
    //   html: template,
    // });
    try {
      const guest = await UserModel.findById(booking.guest);
      const host = await UserModel.findById(booking.host);
      const property = await PropertyModel.findById(booking.property);

      // Prepare price breakdown
      const priceBreakdown = [
        {
          label: `${booking.pricing.nights} nights × ${booking.pricing.currency}${booking.pricing.nightlyRate}`,
          amount: `${booking.pricing.currency}${
            booking.pricing.nightlyRate * booking.pricing.nights
          }`,
        },
      ];

      if (booking.pricing.cleaningFee > 0) {
        priceBreakdown.push({
          label: 'Cleaning fee',
          amount: `${booking.pricing.currency}${booking.pricing.cleaningFee}`,
        });
      }

      if (booking.pricing.serviceFee > 0) {
        priceBreakdown.push({
          label: 'Service fee',
          amount: `${booking.pricing.currency}${booking.pricing.serviceFee}`,
        });
      }

      if (booking.pricing.discount > 0) {
        priceBreakdown.push({
          label: 'Discount',
          amount: `-${booking.pricing.currency}${booking.pricing.discount}`,
        });
      }

      const template = await this.getEmailTemplate('booking-confirmation', {
        bookingId: booking._id,
        guestName: guest.name,
        propertyTitle: property.title,
        propertyAddress: property.location.address,
        checkIn: format(booking.checkIn, 'EEEE, MMMM d, yyyy'),
        checkOut: format(booking.checkOut, 'EEEE, MMMM d, yyyy'),
        guests: `${booking.guests.adults} adults${
          booking.guests.children ? `, ${booking.guests.children} children` : ''
        }${
          booking.guests.infants ? `, ${booking.guests.infants} infants` : ''
        }`,
        priceBreakdown,
        amount: `${booking.pricing.currency}${booking.pricing.total}`,
        hostName: host.name,
        hostPhone: host.phoneNumber,
        actionUrl: `${process.env.APP_URL}/bookings/${booking._id}`,
        supportEmail: process.env.MAIL_USER,
        companyName: 'Onjeki',
        year: new Date().getFullYear(),
      });

      await this.transporter.sendMail({
        from: `"Onjeki" <${process.env.MAIL_USER}>`,
        to: guest.email,
        subject: `Booking Confirmation - ${property.title}`,
        html: template,
      });

      logger.info(`Booking confirmation email sent to ${guest.email}`);
    } catch (error) {
      logger.error(
        `Error sending booking confirmation email: ${error.message}`
      );
      throw HttpException(500, 'Failed to send booking confirmation email');
    }
  }
  async getEmailTemplate(templateName, data) {
    const templatePath = path.resolve(
      __dirname,
      '..',
      '..',
      'templates',
      'emails',
      `${templateName}.hbs`
    );

    try {
      await fs.access(templatePath); // Check if file exists
      const template = await fs.readFile(templatePath, 'utf-8');
      const compile = handlebars.compile(template);
      return compile(data);
    } catch (error) {
      console.error(`Error reading email template: ${error.message}`);
      throw new Error(`Email template "${templateName}" not found.`);
    }
  }

  // async getEmailTemplate(templateName, data) {
  //   const templatePath = path.join(
  //     __dirname,
  //     `../templates/emails/${templateName}.hbs`
  //   );

  //   const templateContent = await fs.readFile(templatePath, 'utf-8');
  //   const compile = handlebars.compile(templateContent);
  //   return compile(data);
  // }

  // async sendBookingConfirmation(booking) {
  //   const template = generateEmailTemplate('bookingConfirmation', {
  //     booking,
  //     property: booking.property,
  //     user: booking.user
  //   });

  //   await this.sendEmail({
  //     to: booking.user.email,
  //     subject: 'Booking Confirmation',
  //     html: template
  //   });
  // }

  // async sendPropertyApproval(property) {
  //   const template = generateEmailTemplate('propertyApproval', {
  //     property,
  //     owner: property.user
  //   });

  //   await this.sendEmail({
  //     to: property.user.email,
  //     subject: 'Property Listing Approved',
  //     html: template
  //   });
  // }

  async sendEmail({ to, subject, html }) {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send email');
    }
  }
}

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default new EmailService();
