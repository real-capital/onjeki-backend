import UserModel from '../../models/user.model.js';

class PushNotificationService {
  constructor() {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }

  async sendToHost(hostId, title, body, data = {}) {
    const host = await UserModel.findById(hostId);
    if (!host.pushToken) return;

    try {
      await admin.messaging().send({
        token: host.pushToken,
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'host_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
      // If token is invalid, remove it from user
      if (error.code === 'messaging/invalid-registration-token') {
        await UserModel.findByIdAndUpdate(hostId, { $unset: { pushToken: 1 } });
      }
    }
  }

  async sendToUser(userId, title, body, data = {}) {
    const user = await UserModel.findById(userId);
    if (!user.pushToken) return;

    try {
      await admin.messaging().send({
        token: user.pushToken,
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
      if (error.code === 'messaging/invalid-registration-token') {
        await UserModel.findByIdAndUpdate(userId, { $unset: { pushToken: 1 } });
      }
    }
  }
}


export default new PushNotificationService();