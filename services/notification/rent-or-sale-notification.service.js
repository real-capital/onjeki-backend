// services/notification.service.js
class RentOrSaleNotificationService {
  constructor() {
    this.fcm = admin.messaging();
    this.emailTransporter = nodemailer.createTransport({
      // Your email configuration
    });
  }

  async sendPushNotification({ token, title, body, data }) {
    try {
      await this.fcm.send({
        token,
        notification: {
          title,
          body,
        },
        data,
      });
    } catch (error) {
      console.error('FCM notification failed:', error);
    }
  }

  async sendEmailNotification({ to, subject, template, context }) {
    try {
      const html = await ejs.renderFile(
        `templates/emails/${template}.ejs`,
        context
      );

      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Email notification failed:', error);
    }
  }
}

export default RentOrSaleNotificationService;