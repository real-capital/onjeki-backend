// // routes/mobile.routes.js
// import { Router } from 'express';
// import MobileController from '../controllers/mobile.controller.js';
// import { isAuthenticated } from '../middlewares/auth.middleware.js';
// import { rateLimiters } from '../middleware/rate-limit.js';

// const router = Router();
// const mobileController = new MobileController();

// router.use(rateLimiters.api);

// // Device management
// router.post('/devices/register', 
//   isAuthenticated, 
//   mobileController.registerDevice
// );

// // Lightweight property listings
// router.get('/properties/featured',
//   mobileController.getFeaturedProperties
// );

// router.get('/properties/nearby',
//   isAuthenticated,
//   mobileController.getNearbyProperties
// );

// // Mobile-optimized search
// router.get('/search',
//   mobileController.mobileSearch
// );

// // Offline data sync
// router.post('/sync',
//   isAuthenticated,
//   mobileController.syncData
// );

// export default router;

// // controllers/mobile.controller.js
// class MobileController {
//   async registerDevice(req, res) {
//     const { deviceToken, platform, deviceId } = req.body;
//     const userId = req.user.id;

//     const device = await DeviceService.registerDevice({
//       userId,
//       deviceToken,
//       platform,
//       deviceId
//     });

//     res.status(200).json({ data: device });
//   }

//   async getFeaturedProperties(req, res) {
//     const properties = await PropertyService.getFeaturedProperties({
//       limit: 10,
//       select: 'title photos price location averageRating', // Lightweight response
//       transform: 'mobile' // Mobile-optimized images
//     });

//     res.status(200).json({ data: properties });
//   }

//   async getNearbyProperties(req, res) {
//     const { latitude, longitude, radius = 5 } = req.query;
    
//     const properties = await PropertyService.getNearbyProperties({
//       coordinates: [longitude, latitude],
//       radius: parseInt(radius),
//       limit: 20,
//       select: 'title photos price location distance', // Include distance
//       transform: 'mobile'
//     });

//     res.status(200).json({ data: properties });
//   }

//   async mobileSearch(req, res) {
//     const { query, filters, page = 1, limit = 20 } = req.query;

//     const results = await SearchService.mobileSearch({
//       query,
//       filters,
//       pagination: { page, limit },
//       select: 'title photos price location averageRating',
//       transform: 'mobile'
//     });

//     res.status(200).json({ data: results });
//   }

//   async syncData(req, res) {
//     const { lastSyncTimestamp, changes } = req.body;
//     const userId = req.user.id;

//     const syncResult = await SyncService.processSyncRequest({
//       userId,
//       lastSyncTimestamp,
//       changes
//     });

//     res.status(200).json({ data: syncResult });
//   }
// }