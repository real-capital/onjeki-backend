import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

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
        html
      });
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send email');
    }
  }
}

export default new EmailService();
