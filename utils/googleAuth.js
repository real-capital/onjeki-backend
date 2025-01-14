import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID } from '../config/index.js';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export async function verifyGoogleToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
  });

  const payload = ticket.getPayload();
  return payload;
}
