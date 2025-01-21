import NotificationModel from "../../models/notifications.model";
import PropertyModel from "../../models/properties.model";

class SyncService {
    async processSyncRequest({ userId, lastSyncTimestamp, changes }) {
      const serverChanges = await this.getServerChanges(userId, lastSyncTimestamp);
      const clientChanges = await this.processClientChanges(userId, changes);
  
      return {
        timestamp: new Date().toISOString(),
        changes: serverChanges,
        conflicts: clientChanges.conflicts
      };
    }
  
    async getServerChanges(userId, lastSyncTimestamp) {
      const timestamp = new Date(lastSyncTimestamp);
  
      const [
        bookings,
        properties,
        notifications
      ] = await Promise.all([
        BookingModel.find({
          user: userId,
          updatedAt: { $gt: timestamp }
        }).select('_id status updatedAt'),
        
        PropertyModel.find({
          $or: [
            { user: userId },
            { '_id': { $in: await this.getUserWishlist(userId) } }
          ],
          updatedAt: { $gt: timestamp }
        }).select('_id title price updatedAt'),
        
        NotificationModel.find({
          user: userId,
          createdAt: { $gt: timestamp }
        }).select('_id message createdAt')
      ]);
  
      return {
        bookings,
        properties,
        notifications
      };
    }
  
    async processClientChanges(userId, changes) {
      const conflicts = [];
  
      // Process wishlist changes
      if (changes.wishlist) {
        await this.processWishlistChanges(userId, changes.wishlist, conflicts);
      }
  
      // Process booking changes
      if (changes.bookings) {
        await this.processBookingChanges(userId, changes.bookings, conflicts);
      }
  
      return { conflicts };
    }
  }