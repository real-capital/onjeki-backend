// services/admin.service.js
import AdminModel from '../../models/admin.model.js';
import PropertyModel from '../../models/property.model.js';
import BookingModel from '../../models/booking.model.js';
import UserModel from '../../models/user.model.js';
import { EListStatus } from '../../enum/house.enum.js';
import { generateAnalytics } from '../../utils/analytics.js';

// class AdminService {
//   async getDashboardStats() {
//     try {
//       const [
//         totalProperties,
//         totalUsers,
//         totalBookings,
//         recentProperties,
//         recentBookings,
//         analytics
//       ] = await Promise.all([
//         PropertyModel.countDocuments(),
//         UserModel.countDocuments(),
//         BookingModel.countDocuments(),
//         PropertyModel.find().sort({ createdAt: -1 }).limit(5),
//         BookingModel.find().populate('property admin').sort({ createdAt: -1 }).limit(5),
//         this.getAnalytics()
//       ]);

//       return {
//         totalProperties,
//         totalUsers,
//         totalBookings,
//         recentProperties,
//         recentBookings,
//         analytics
//       };
//     } catch (error) {
//       throw new Error('Error fetching dashboard stats');
//     }
//   }

//   async getAnalytics() {
//     const thirtyDaysAgo = new Date();
//     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

//     const [bookings, properties, users] = await Promise.all([
//       BookingModel.find({ createdAt: { $gte: thirtyDaysAgo } }),
//       PropertyModel.find({ createdAt: { $gte: thirtyDaysAgo } }),
//       UserModel.find({ createdAt: { $gte: thirtyDaysAgo } })
//     ]);

//     return generateAnalytics({ bookings, properties, users });
//   }

//   async reviewProperty(propertyId, status, adminId) {
//     const property = await PropertyModel.findById(propertyId);
//     if (!property) {
//       throw new Error('Property not found');
//     }

//     property.listStatus = status;
//     property.reviewedBy = adminId;
//     property.reviewedAt = new Date();

//     await property.save();
//     return property;
//   }

//   async getPropertyReviewQueue(filters = {}) {
//     const query = { listStatus: EListStatus.UNDER_REVIEW, ...filters };
//     return PropertyModel.find(query)
//       .populate('user', 'name email')
//       .sort({ createdAt: 1 });
//   }
// }

class AdminService {
    async getDashboardStats() {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));
  
      const [
        totalProperties,
        totalUsers,
        totalBookings,
        recentBookings,
        propertyStats,
        revenue
      ] = await Promise.all([
        PropModel.countDocuments(),
        UserModel.countDocuments(),
        BookingModel.countDocuments(),
        BookingModel.find()
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('property user'),
        this.getPropertyStats(thirtyDaysAgo),
        this.getRevenueStats(thirtyDaysAgo)
      ]);
  
      return {
        totalProperties,
        totalUsers,
        totalBookings,
        recentBookings,
        propertyStats,
        revenue
      };
    }
  
    async getPropertyStats(startDate) {
      return PropModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            averagePrice: { $avg: '$price' }
          }
        }
      ]);
    }
  
    async getRevenueStats(startDate) {
      return BookingModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: 'CONFIRMED'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            totalRevenue: { $sum: '$totalPrice' },
            bookingCount: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ]);
    }
  }

export default AdminService;