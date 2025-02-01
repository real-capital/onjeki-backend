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





// import { Notification } from '../models/Notification';
// import { emitSocketEvent } from './socketService';
// import emailService from './emailService';
// import pushNotificationService from './pushNotificationService';

// class NotificationService {
//   async createNotification(userId, type, data) {
//     try {
//       const notification = await Notification.create({
//         user: userId,
//         type,
//         data,
//         read: false
//       });

//       // Send real-time notification via WebSocket
//       emitSocketEvent(userId, 'notification', notification);

//       // Send push notification if enabled
//       await this.sendPushNotification(userId, type, data);

//       // Send email notification if enabled
//       await this.sendEmailNotification(userId, type, data);

//       return notification;
//     } catch (error) {
//       logger.error('Create notification failed:', error);
//       throw error;
//     }
//   }

//   async sendPushNotification(userId, type, data) {
//     try {
//       const user = await User.findById(userId);
//       if (!user.settings?.notifications?.push?.[type]) return;

//       const notificationData = this.formatNotification(type, data);
//       await pushNotificationService.send(
//         user.pushTokens,
//         notificationData.title,
//         notificationData.body,
//         data
//       );
//     } catch (error) {
//       logger.error('Send push notification failed:', error);
//     }
//   }

//   async sendEmailNotification(userId, type, data) {
//     try {
//       const user = await User.findById(userId);
//       if (!user.settings?.notifications?.email?.[type]) return;

//       const notificationData = this.formatNotification(type, data);
//       await emailService.sendNotificationEmail(
//         user.email,
//         notificationData.title,
//         notificationData.template,
//         data
//       );
//     } catch (error) {
//       logger.error('Send email notification failed:', error);
//     }
//   }

//   formatNotification(type, data) {
//     switch (type) {
//       case 'new_booking':
//         return {
//           title: 'New Booking Request',
//           body: `You have a new booking request for ${data.propertyTitle}`,
//           template: 'newBooking'
//         };

//       case 'booking_confirmed':
//         return {
//           title: 'Booking Confirmed',
//           body: `Your booking for ${data.propertyTitle} has been confirmed`,
//           template: 'bookingConfirmed'
//         };

//       case 'booking_cancelled':
//         return {
//           title: 'Booking Cancelled',
//           body: `Booking for ${data.propertyTitle} has been cancelled`,
//           template: 'bookingCancelled'
//         };

//       case 'new_message':
//         return {
//           title: 'New Message',
//           body: `You have a new message from ${data.senderName}`,
//           template: 'newMessage'
//         };

//       case 'new_review':
//         return {
//           title: 'New Review',
//           body: `You have a new review for ${data.propertyTitle}`,
//           template: 'newReview'
//         };

//       // Add more notification types as needed
      
//       default:
//         return {
//           title: 'New Notification',
//           body: 'You have a new notification',
//           template: 'default'
//         };
//     }
//   }

//   async markAsRead(userId, notificationIds) {
//     try {
//       await Notification.updateMany(
//         {
//           _id: { $in: notificationIds },
//           user: userId
//         },
//         { $set: { read: true, readAt: new Date() } }
//       );

//       return true;
//     } catch (error) {
//       logger.error('Mark notifications as read failed:', error);
//       throw error;
//     }
//   }

//   async getUnreadCount(userId) {
//     try {
//       return await Notification.countDocuments({
//         user: userId,
//         read: false
//       });
//     } catch (error) {
//       logger.error('Get unread count failed:', error);
//       throw error;
//     }
//   }

//   async getUserNotifications(userId, query = {}) {
//     try {
//       const { page = 1, limit = 20, read } = query;

//       const filter = { user: userId };
//       if (read !== undefined) {
//         filter.read = read === 'true';
//       }

//       const notifications = await Notification.find(filter)
//         .sort({ createdAt: -1 })
//         .skip((page - 1) * limit)
//         .limit(limit)
//         .populate('data.booking')
//         .populate('data.property')
//         .populate('data.sender', 'profile.name profile.photo');

//       const total = await Notification.countDocuments(filter);

//       return {
//         notifications,
//         total,
//         page: parseInt(page),
//         pages: Math.ceil(total / limit)
//       };
//     } catch (error) {
//       logger.error('Get user notifications failed:', error);
//       throw error;
//     }
//   }
// }

// export default new NotificationService();