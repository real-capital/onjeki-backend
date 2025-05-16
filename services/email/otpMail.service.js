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

  async sendPaymentFailureEmail(booking) {
    await this.sendEmail({
      from: `"Onjeki" <${process.env.MAIL_USER}>`,
      to: booking.guest.email,
      subject: 'Payment Failed for Your Booking',
      template: 'payment-failure',
      context: {
        bookingId: booking._id,
        propertyTitle: booking.property.title,
        bookingDate: booking.createdAt,
      },
    });
  }

  async sendPaymentCancellationEmail(booking) {
    await this.sendEmail({
      to: booking.guest.email,
      subject: 'Booking Payment Cancelled',
      template: 'payment-cancellation',
      context: {
        bookingId: booking._id,
        propertyTitle: booking.property.title,
        bookingDate: booking.createdAt,
      },
    });
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

  /**
   * Send email when a stay is completed
   */
  async sendStayCompletedEmail(booking) {
    try {
      const host = await UserModel.findById(booking.host);
      const guest = await UserModel.findById(booking.guest);
      const property = await PropertyModel.findById(booking.property);

      const template = await this.getEmailTemplate('stay-completed', {
        hostName: host.name,
        guestName: guest.name,
        propertyTitle: property.title,
        checkIn: format(booking.checkIn, 'MMM d, yyyy'),
        checkOut: format(booking.checkOut, 'MMM d, yyyy'),
        bookingId: booking._id,
        amount: formatCurrency(booking.pricing.total, booking.pricing.currency),
        actionUrl: `${process.env.HOST_DASHBOARD_URL}/bookings/${booking._id}`,
        earningsUrl: `${process.env.HOST_DASHBOARD_URL}/earnings`,
        supportEmail: process.env.MAIL_USER,
        companyName: 'Onjeki',
        year: new Date().getFullYear(),
      });

      await this.transporter.sendMail({
        from: `"Onjeki" <${process.env.MAIL_USER}>`,
        to: host.email,
        subject: 'Stay Completed - Earnings Update',
        html: template,
      });

      logger.info(`Stay completed email sent to host ${host.email}`);
    } catch (error) {
      logger.error(`Error sending stay completed email: ${error.message}`);
    }
  }

  /**
   * Send email when earnings become available
   */
  async sendEarningsAvailableEmail(hostId, earnings) {
    try {
      const host = await UserModel.findById(hostId);
      const totalAmount = earnings.reduce(
        (sum, earning) => sum + earning.netAmount,
        0
      );
      const currency = earnings[0]?.currency || 'NGN';

      const template = await this.getEmailTemplate('earnings-available', {
        hostName: host.name,
        totalAmount: formatCurrency(totalAmount, currency),
        bookingsCount: earnings.length,
        earningsUrl: `${process.env.HOST_DASHBOARD_URL}/earnings`,
        payoutUrl: `${process.env.HOST_DASHBOARD_URL}/payouts/request`,
        supportEmail: process.env.MAIL_USER,
        companyName: 'Onjeki',
        year: new Date().getFullYear(),
      });

      await this.transporter.sendMail({
        from: `"Onjeki" <${process.env.MAIL_USER}>`,
        to: host.email,
        subject: 'Your Earnings Are Now Available',
        html: template,
      });

      logger.info(`Earnings available email sent to host ${host.email}`);
    } catch (error) {
      logger.error(`Error sending earnings available email: ${error.message}`);
    }
  }

  /**
   * Send email when a payout is requested
   */
  async sendPayoutRequestedEmail(payout) {
    try {
      const host = await UserModel.findById(payout.host);

      const template = await this.getEmailTemplate('payout-requested', {
        hostName: host.name,
        payoutId: payout._id,
        amount: formatCurrency(payout.amount, payout.currency),
        bankDetails: {
          accountName: payout.bankDetails.accountName,
          accountNumber: maskAccountNumber(payout.bankDetails.accountNumber),
          bankName: payout.bankDetails.bankName,
        },
        estimatedArrival: format(
          new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Estimated 2 days
          'EEEE, MMMM d, yyyy'
        ),
        payoutsUrl: `${process.env.HOST_DASHBOARD_URL}/payouts`,
        supportEmail: process.env.MAIL_USER,
        companyName: 'Onjeki',
        year: new Date().getFullYear(),
      });

      await this.transporter.sendMail({
        from: `"Onjeki" <${process.env.MAIL_USER}>`,
        to: host.email,
        subject: 'Your Payout Request Has Been Received',
        html: template,
      });

      logger.info(`Payout requested email sent to host ${host.email}`);
    } catch (error) {
      logger.error(`Error sending payout requested email: ${error.message}`);
    }
  }

  /**
   * Send email when a payout is completed
   */
  async sendPayoutCompletedEmail(payout) {
    try {
      const host = await UserModel.findById(payout.host);

      const template = await this.getEmailTemplate('payout-completed', {
        hostName: host.name,
        payoutId: payout._id,
        amount: formatCurrency(payout.amount, payout.currency),
        bankDetails: {
          accountName: payout.bankDetails.accountName,
          accountNumber: maskAccountNumber(payout.bankDetails.accountNumber),
          bankName: payout.bankDetails.bankName,
        },
        completedDate: format(payout.completedDate, 'EEEE, MMMM d, yyyy'),
        payoutsUrl: `${process.env.HOST_DASHBOARD_URL}/payouts`,
        supportEmail: process.env.MAIL_USER,
        companyName: 'Onjeki',
        year: new Date().getFullYear(),
      });

      await this.transporter.sendMail({
        from: `"Onjeki" <${process.env.MAIL_USER}>`,
        to: host.email,
        subject: 'Your Payout Has Been Processed',
        html: template,
      });

      logger.info(`Payout completed email sent to host ${host.email}`);
    } catch (error) {
      logger.error(`Error sending payout completed email: ${error.message}`);
    }
  }

  /**
   * Send email when a payout fails
   */
  async sendPayoutFailedEmail(payout) {
    try {
      const host = await UserModel.findById(payout.host);

      const template = await this.getEmailTemplate('payout-failed', {
        hostName: host.name,
        payoutId: payout._id,
        amount: formatCurrency(payout.amount, payout.currency),
        bankDetails: {
          accountName: payout.bankDetails.accountName,
          accountNumber: maskAccountNumber(payout.bankDetails.accountNumber),
          bankName: payout.bankDetails.bankName,
        },
        failureReason: payout.failureReason || 'Bank transfer failed',
        actionUrl: `${process.env.HOST_DASHBOARD_URL}/payouts/retry/${payout._id}`,
        supportEmail: process.env.MAIL_USER,
        companyName: 'Onjeki',
        year: new Date().getFullYear(),
      });

      await this.transporter.sendMail({
        from: `"Onjeki" <${process.env.MAIL_USER}>`,
        to: host.email,
        subject: 'Payout Failed - Action Required',
        html: template,
      });

      logger.info(`Payout failed email sent to host ${host.email}`);
    } catch (error) {
      logger.error(`Error sending payout failed email: ${error.message}`);
    }
  }

  /**
   * Send email when a bank account is verified
   */
  async sendBankAccountVerifiedEmail(userId, bankAccount) {
    try {
      const user = await UserModel.findById(userId);

      const template = await this.getEmailTemplate('bank-account-verified', {
        userName: user.name,
        bankDetails: {
          accountName: bankAccount.accountName,
          accountNumber: maskAccountNumber(bankAccount.accountNumber),
          bankName: bankAccount.bankName,
        },
        payoutsUrl: `${process.env.HOST_DASHBOARD_URL}/payouts`,
        supportEmail: process.env.MAIL_USER,
        companyName: 'Onjeki',
        year: new Date().getFullYear(),
      });

      await this.transporter.sendMail({
        from: `"Onjeki" <${process.env.MAIL_USER}>`,
        to: user.email,
        subject: 'Bank Account Successfully Verified',
        html: template,
      });

      logger.info(`Bank account verified email sent to user ${user.email}`);
    } catch (error) {
      logger.error(
        `Error sending bank account verified email: ${error.message}`
      );
    }
  }
  async sendCheckInReminderEmail(booking) {
    try {
      const guest = await UserModel.findById(booking.guest);
      const property = await PropertyModel.findById(booking.property);

      // Format check-in date and time separately for email
      const checkInDate = format(booking.checkIn, 'EEEE, MMMM d, yyyy');
      const checkInTime = format(booking.checkIn, 'h:mm a');

      // Prepare template data matching your Handlebars placeholders
      const template = await this.getEmailTemplate('check-in-reminder', {
        guestName: guest.name,
        propertyTitle: property.title,
        propertyAddress: property.location.address,
        checkInDate,
        checkInTime,
        bookingUrl: `${process.env.APP_URL}/bookings/${booking._id}`,
        supportEmail: process.env.MAIL_USER,
        companyName: 'Onjeki',
        year: new Date().getFullYear(),
      });

      await this.transporter.sendMail({
        from: `"Onjeki" <${process.env.MAIL_USER}>`,
        to: guest.email,
        subject: `Reminder: Your Check-in is Tomorrow - ${property.title}`,
        html: template,
      });

      logger.info(`Check-in reminder email sent to ${guest.email}`);
      return true;
    } catch (error) {
      logger.error(`Error sending check-in reminder email: ${error.message}`);
      return false;
    }
  }

  async sendCheckInConfirmationEmail(booking) {
    try {
      const guest = await UserModel.findById(booking.guest);
      const property = await PropertyModel.findById(booking.property);

      const template = await this.getEmailTemplate('check-in-confirmation', {
        guestName: guest.name,
        propertyTitle: property.title,
        propertyAddress: property.location.address,
        checkInTime: format(
          booking.checkInDetails.actualCheckInTime,
          'h:mm a, MMMM d, yyyy'
        ),
        checkOutDate: format(booking.checkOut, 'EEEE, MMMM d, yyyy'),
        bookingUrl: `${process.env.APP_URL}/bookings/${booking._id}`,
        supportEmail: process.env.MAIL_USER,
        companyName: 'Onjeki',
        year: new Date().getFullYear(),
      });

      await this.transporter.sendMail({
        from: `"Onjeki" <${process.env.MAIL_USER}>`,
        to: guest.email,
        subject: `Check-in Confirmed - ${property.title}`,
        html: template,
      });

      logger.info(`Check-in confirmation email sent to ${guest.email}`);
      return true;
    } catch (error) {
      logger.error(
        `Error sending check-in confirmation email: ${error.message}`
      );
      return false;
    }
  }

  async sendCheckOutConfirmationEmail(booking) {
    try {
      const guest = await UserModel.findById(booking.guest);
      const property = await PropertyModel.findById(booking.property);

      const template = await this.getEmailTemplate('check-out-confirmation', {
        guestName: guest.name,
        propertyTitle: property.title,
        checkInDate: format(booking.checkIn, 'MMM d, yyyy'),
        checkOutDate: format(booking.checkOut, 'MMM d, yyyy'),
        bookingUrl: `${process.env.APP_URL}/bookings/${booking._id}`,
        reviewUrl: `${process.env.APP_URL}/bookings/${booking._id}/review`,
        supportEmail: process.env.MAIL_USER,
        companyName: 'Onjeki',
        year: new Date().getFullYear(),
      });

      await this.transporter.sendMail({
        from: `"Onjeki" <${process.env.MAIL_USER}>`,
        to: guest.email,
        subject: `Check-out Confirmed - ${property.title}`,
        html: template,
      });

      logger.info(`Check-out confirmation email sent to ${guest.email}`);
      return true;
    } catch (error) {
      logger.error(
        `Error sending check-out confirmation email: ${error.message}`
      );
      return false;
    }
  }
  /**
   * Send monthly earnings summary
   */
  async sendMonthlyEarningsSummary(hostId, month, year, summary) {
    try {
      const host = await UserModel.findById(hostId);
      const monthName = new Date(year, month - 1, 1).toLocaleString('default', {
        month: 'long',
      });

      const template = await this.getEmailTemplate('monthly-earnings', {
        hostName: host.name,
        month: monthName,
        year: year,
        stats: {
          totalEarnings: formatCurrency(summary.totalEarnings, 'NGN'),
          totalBookings: summary.totalBookings,
          occupancyRate: `${Math.round(summary.occupancyRate)}%`,
          pendingEarnings: formatCurrency(summary.pendingEarnings, 'NGN'),
          availableEarnings: formatCurrency(summary.availableEarnings, 'NGN'),
          paidOut: formatCurrency(summary.paidOut, 'NGN'),
        },
        earningsUrl: `${process.env.HOST_DASHBOARD_URL}/earnings?month=${month}&year=${year}`,
        supportEmail: process.env.MAIL_USER,
        companyName: 'Onjeki',
        year: new Date().getFullYear(),
      });

      await this.transporter.sendMail({
        from: `"Onjeki" <${process.env.MAIL_USER}>`,
        to: host.email,
        subject: `Your Earnings Summary for ${monthName} ${year}`,
        html: template,
      });

      logger.info(`Monthly earnings summary sent to host ${host.email}`);
    } catch (error) {
      logger.error(`Error sending monthly earnings summary: ${error.message}`);
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

function maskAccountNumber(accountNumber) {
  if (!accountNumber) return '';
  const visible = accountNumber.slice(-4);
  const masked = accountNumber.slice(0, -4).replace(/\d/g, '*');
  return masked + visible;
}

export default new EmailService();
