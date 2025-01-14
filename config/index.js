import { config } from 'dotenv';
config();

export const CREDENTIALS = process.env.CREDENTIALS === 'true';
export const {
  NODE_ENV,
  PORT,
  MONGODB_URI,
  LOG_FORMAT,
  LOG_DIR,
  ACCESS_TOKEN,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  CALLBACK_URL,
  CLIENT_URL,
  MAIL_SERVICE,
  MAIL_PASS,
  MAIL_USER,
  CLOUDINARY_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_SECRET,
} = process.env;
