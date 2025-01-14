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
}

export default new EmailService();
