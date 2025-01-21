// // services/audit.service.js
// import AuditModel from '../models/audit.model.js';
// import { createLogger, format, transports } from 'winston';

// const logger = createLogger({
//   format: format.combine(
//     format.timestamp(),
//     format.json()
//   ),
//   transports: [
//     new transports.File({ filename: 'logs/error.log', level: 'error' }),
//     new transports.File({ filename: 'logs/combined.log' })
//   ]
// });

// if (process.env.NODE_ENV !== 'production') {
//   logger.add(new transports.Console({
//     format: format.combine(
//       format.colorize(),
//       format.simple()
//     )
//   }));
// }

// class AuditService {
//   async logAction(data) {
//     try {
//       const {
//         userId,
//         action,
//         entityType,
//         entityId,
//         changes,
//         ipAddress,
//         userAgent
//       } = data;

//       const auditLog = await AuditModel.create({
//         userId,
//         action,
//         entityType,
//         entityId,
//         changes,
//         metadata: {
//           ipAddress,
//           userAgent,
//           timestamp: new Date()
//         }
//       });

//       logger.info('Audit log created', { auditLog });
//       return auditLog;
//     } catch (error) {
//       logger.error('Error creating audit log', { error, data });
//       throw error;
//     }
//   }

//   async getAuditLogs(filters = {}, pagination = { page: 1, limit: 20 }) {
//     const query = {};
    
//     if (filters.userId) query.userId = filters.userId;
//     if (filters.action) query.action = filters.action;
//     if (filters.entityType) query.entityType = filters.entityType;
//     if (filters.dateRange) {
//       query['metadata.timestamp'] = {
//         $gte: filters.dateRange.start,
//         $lte: filters.dateRange.end
//       };
//     }

//     const skip = (pagination.page - 1) * pagination.limit;

//     return AuditModel.find(query)
//       .sort({ 'metadata.timestamp': -1 })
//       .skip(skip)
//       .limit(pagination.limit);
//   }
// }

// export default new AuditService();