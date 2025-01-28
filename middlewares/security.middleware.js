// middlewares/security.middleware.js
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import cors from 'cors';

export const securityMiddleware = (app) => {
  // // Rate limiting
  // const limiter = rateLimit({
  //   windowMs: 15 * 60 * 1000, // 15 minutes
  //   max: 100, // limit each IP to 100 requests per windowMs
  // });

  // Apply security middlewares
  // app.use(limiter);
  // app.use(helmet());
  // app.use(hpp());
  // app.use(
  //   cors({
  //     origin: process.env.ALLOWED_ORIGINS.split(','),
  //     methods: ['GET', 'POST', 'PUT', 'DELETE'],
  //     allowedHeaders: ['Content-Type', 'Authorization'],
  //   })
  // );

  // // Additional security headers
  // app.use((req, res, next) => {
  //   res.setHeader('X-Content-Type-Options', 'nosniff');
  //   res.setHeader('X-Frame-Options', 'DENY');
  //   res.setHeader('X-XSS-Protection', '1; mode=block');
  //   next();
  // });
};
