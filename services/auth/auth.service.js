import axios from 'axios';
import UserModel from '../../models/user.model.js';
import OtpModel from '../../models/otp.model.js';
import otpGenerator from 'otp-generator';
import otpEmailService from '../../services/email/otpMail.service.js';
import Jwt from '../../utils/jwt.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';
import { OAuth2Client } from 'google-auth-library';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  CALLBACK_URL,
} from '../../config/index.js';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);
class AuthService {
  // Create account or login with email
  async createAccount(user) {
    user.email = user.email.toLowerCase();
    const createdUser = await UserModel.findOneAndUpdate(
      { email: user.email },
      { ...user },
      { new: true, upsert: true }
    );

    if (createdUser.otp) {
      // Clean up old OTP
      await OtpModel.findByIdAndDelete(createdUser.otp);
      createdUser.otp = undefined;
      await createdUser.save();
    }

    // Generate a new OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    const otpExpiration = new Date(Date.now() + 2 * 60 * 1000);
    const otpRecord = new OtpModel({
      userId: createdUser._id,
      otp,
      expiration: otpExpiration,
    });

    await otpRecord.save();

    createdUser.otp = otpRecord._id;
    await createdUser.save();

    // Send OTP via email
    await otpEmailService.sendOtp(user.email, otp);

    return 'Otp on its way to the email';
  }

  // Validate OTP and authenticate user
  async validateOtp(validUser) {
    validUser.email = validUser.email.toLowerCase();
    const user = await UserModel.findOne({ email: validUser.email });

    if (!user || !user.otp) {
      throw new HttpException(
        StatusCodes.NOT_FOUND,
        'User not found or OTP not generated'
      );
    }

    const otpRecord = await OtpModel.findById(user.otp);
    if (!otpRecord) {
      throw new HttpException(StatusCodes.BAD_REQUEST, 'Invalid OTP');
    }

    if (otpRecord.otp !== validUser.otp) {
      throw new HttpException(StatusCodes.BAD_REQUEST, 'Incorrect OTP');
    }

    if (new Date() > otpRecord.expiration) {
      throw new HttpException(StatusCodes.BAD_REQUEST, 'OTP has expired');
    }

    const token = Jwt.signJwt({ email: user.email }, '7d');

    // Clear OTP after validation
    await OtpModel.findByIdAndDelete(user.otp);
    user.otp = undefined;
    await user.save();

    return { token, name: user.name };
  }

  // Create or update user based on Google or Apple profile info
  async createOrUpdateUser(profile) {
    const { email, name, googleUserId } = profile;

    let user = await UserModel.findOne({ email });

    if (!user) {
      // User doesn't exist, create a new one
      user = new UserModel({
        email,
        name,
        googleUserId: googleUserId || null,
        isEmailVerified: true, // Assuming email is verified from Google/Apple
      });
      await user.save();
    } else {
      // Update existing user with Google/Apple info
      if (googleUserId && !user.googleUserId) {
        user.googleUserId = googleUserId;
      }

      user.name = user.name || name; // Update name if not already set
      user.isEmailVerified = true; // Mark email as verified
      await user.save();
    }

    return user;
  }

  async handleGoogleLogin(code) {
    // Exchange the authorization code for tokens
    // const oauthRequest = {
    //   url: new URL('https://oauth2.googleapis.com/token'),
    //   params: {
    //     client_id: GOOGLE_CLIENT_ID,
    //     client_secret: GOOGLE_CLIENT_SECRET,
    //     code,
    //     grant_type: 'authorization_code',
    //     redirect_uri: CALLBACK_URL,
    //   },
    // };

    // const accessToken = response.data.access_token;
    // console.log('Access Token:', accessToken);

    // const oauthResponse = await axios.post(oauthRequest.url.toString(), null, {
    //   params: oauthRequest.params,
    // });

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: CALLBACK_URL,
    });
      
    const accessToken = response.data;
    console.log('Access Token here:', accessToken);

    // const { id_token } = response.data;

    // if (!id_token) {
    //   throw new HttpException(400, 'Invalid Google response');
    // }

    // Verify the Google ID token and get user info
    const userInfo = await this.verifyGoogleIdToken(accessToken);

    
    // Update or create the user in your database
    let user = await UserModel.findOne({ email: userInfo.email });

    if (!user) {
      // Create a new user if not found
      user = new UserModel({
        email: userInfo.email,
        name: userInfo.name,
        // username: userInfo.email.split('@')[0], // Default username
        // Add other default fields if needed
      });
    } else {
      // Update existing user details if needed
      user.name = userInfo.name || user.name;
    }

    user.googleVerified = userInfo.verifiedEmail;
    await user.save();

    return {
      email: user.email,
      name: user.name,
      googleVerified: user.googleVerified,
    };
  }

  async verifyGoogleIdToken(idToken) {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    return {
      email: payload.email,
      name: payload.name,
      verifiedEmail: payload.email_verified,
    };
  }

  //   async handleGoogleLogin(code) {
  //     const oauthRequest = {
  //       url: new URL('https://oauth2.googleapis.com/token'),
  //       params: {
  //         client_id: process.env.GOOGLE_CLIENT_ID,
  //         client_secret: process.env.GOOGLE_CLIENT_SECRET,
  //         code,
  //         grant_type: 'authorization_code',
  //         redirect_uri: process.env.GOOGLE_REDIRECT_URI,
  //       },
  //     };

  //     const oauthResponse = await axios.post(
  //       oauthRequest.url.toString(),
  //       null,
  //       { params: oauthRequest.params }
  //     );

  //     const { id_token } = oauthResponse.data;

  //     if (!id_token) {
  //       throw new HttpException(400, 'Invalid Google response');
  //     }

  //     const userInfo = await this.verifyGoogleIdToken(id_token);
  //     return userInfo;
  //   }

  //   async verifyGoogleIdToken(idToken) {
  //     const ticket = await client.verifyIdToken({
  //       idToken,
  //       audience: process.env.GOOGLE_CLIENT_ID,
  //     });

  //     const payload = ticket.getPayload();
  //     return {
  //       email: payload.email,
  //       name: payload.name,
  //       verifiedEmail: payload.email_verified,
  //     };
  //   }
}

export default AuthService;
