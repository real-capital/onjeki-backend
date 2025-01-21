// services/notification.service.js
import notificationModel from '../../models/notification.model.js';
import UserModel from '../../models/user.model.js';
import { sendPushNotification } from '../../utils/pushNotification.js';

class NotificationService {
  async createNotification(userId, notification) {
    try {
      const newNotification = await notificationModel.create({
        ...notification,
        date: new Date()
      });

      // Add notification to user's notifications array
      await UserModel.findByIdAndUpdate(userId, {
        $push: { notification: newNotification._id }
      });

      // Send push notification if user has device token
      const user = await UserModel.findById(userId);
      if (user.deviceToken) {
        await sendPushNotification(user.deviceToken, {
          title: notification.header,
          body: notification.message
        });
      }

      return newNotification;
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error creating notification'
      );
    }
  }

  async getUserNotifications(userId) {
    try {
      const user = await UserModel.findById(userId).populate('notification');
      return user.notification;
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching notifications'
      );
    }
  }

  async markNotificationAsRead(notificationId, userId) {
    try {
      const notification = await notificationModel.findOneAndUpdate(
        { _id: notificationId },
        { read: true },
        { new: true }
      );

      return notification;
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error updating notification'
      );
    }
  }
}

export default NotificationService;