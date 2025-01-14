import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN } from '../config/index.js';


class Jwt {
    static signJwt(value, expiresIn) {
        return jwt.sign(value, ACCESS_TOKEN, { expiresIn });
    }

    static verifyJwt(value) {
        return jwt.verify(value, ACCESS_TOKEN);
    }

    static isJwtExpired(token) {
        try {
            const decoded = jwt.verify(token, ACCESS_TOKEN);
            const currentTime = Math.floor(Date.now() / 1000);
            return decoded.exp ? decoded.exp < currentTime : true;
        } catch (error) {
            return true; // If verification fails, consider the token as expired
        }
    }

    static isDurationMoreThan(token, periodInSeconds) {
        try {
            const decoded = jwt.verify(token, ACCESS_TOKEN);
            const currentTime = Math.floor(Date.now() / 1000);
            return decoded.exp ? (decoded.exp - currentTime) > periodInSeconds : false;
        } catch (error) {
            return false; // If verification fails, we assume the duration is not sufficient
        }
    }

    static decodeJwtWithoutVerification(token) {
        try {
            return jwt.decode(token);
        } catch (error) {
            return null; // If decoding fails, return null
        }
    }

    static refreshJwt(token, expiresIn) {
        try {
            const decoded = jwt.verify(token, ACCESS_TOKEN);
            delete decoded.iat; // Remove issued at
            delete decoded.exp; // Remove expiration
            return jwt.sign(decoded, ACCESS_TOKEN, { expiresIn });
        } catch (error) {
            return null; // If verification fails, return null
        }
    }

    static getTokenExpirationTime(token) {
        try {
            const decoded = jwt.verify(token, ACCESS_TOKEN);
            return decoded.exp || null;
        } catch (error) {
            return null; // If verification fails, return null
        }
    }

    static getTokenIssuedAtTime(token) {
        try {
            const decoded = jwt.verify(token, ACCESS_TOKEN);
            return decoded.iat || null;
        } catch (error) {
            return null; // If verification fails, return null
        }
    }
}

export default Jwt;
