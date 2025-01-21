// // services/analytics.service.js
// import AnalyticsModel from '../models/analytics.model.js';

// class AnalyticsService {
//   async trackEvent(eventData) {
//     const {
//       eventType,
//       userId,
//       propertyId,
//       metadata = {}
//     } = eventData;

//     await AnalyticsModel.create({
//       eventType,
//       userId,
//       propertyId,
//       metadata,
//       timestamp: new Date()
//     });
//   }

//   async getPropertyAnalytics(propertyId, dateRange) {
//     const { startDate, endDate } = dateRange;
    
//     const analytics = await AnalyticsModel.aggregate([
//       {
//         $match: {
//           propertyId,
//           timestamp: {
//             $gte: new Date(startDate),
//             $lte: new Date(endDate)
//           }
//         }
//       },
//       {
//         $group: {
//           _id: '$eventType',
//           count: { $sum: 1 }
//         }
//       }
//     ]);

//     return analytics;
//   }

//   async getUserBehaviorAnalytics(userId) {
//     return AnalyticsModel.aggregate([
//       {
//         $match: { userId }
//       },
//       {
//         $group: {
//           _id: {
//             eventType: '$eventType',
//             month: { $month: '$timestamp' }
//           },
//           count: { $sum: 1 }
//         }
//       }
//     ]);
//   }
// }

// export default new AnalyticsService();