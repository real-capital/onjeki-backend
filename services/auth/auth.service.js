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

    const token = Jwt.signJwt({ id: user.id, email: user.email }, '70d');

    // Clear OTP after validation
    await OtpModel.findByIdAndDelete(user.otp);
    user.otp = undefined;
    await user.save();

    return { token, name: user.name };
  }

  async getUser(userId) {
    const user = UserModel.findById(userId);
    if (!user) {
      throw new HttpException(StatusCodes.NOT_FOUND, 'User Not Found');
    }
    return user;
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

  async updateNewToListing(userId) {
    try {
      const updateUser = await UserModel.findOneAndUpdate(
        { _id: userId },
        {
          newToListing: false,
        },
        { new: true }
      );
      await updateUser.save();
      return updateUser;
    } catch (error) {
      throw new HttpException(
        error.statusCode || StatusCodes.BAD_REQUEST,
        error.message
      );
    }
  }

  async handleGoogleLogin(code) {
    try {
      // Exchange authorization code for access token and id token
      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        null,
        {
          params: {
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: CALLBACK_URL,
          },
        }
      );

      // Use access_token or id_token to fetch user profile
      const { access_token, id_token } = response.data;
      console.log('Access Token:', access_token);
      console.log('ID Token:', id_token);

      // Step 2: Use access_token to fetch user profile
      const userInfoResponse = await axios.get(
        'https://www.googleapis.com/oauth2/v1/userinfo',
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );
      console.log(userInfoResponse);

      console.log('User Info:', userInfoResponse.data);

      const { email, name, verified_email, id } = userInfoResponse.data;

      // Step 3: Check if the user exists in the database
      let user = await UserModel.findOne({ email });

      console.log('User found in DB:', user);

      if (!user) {
        // Create a new user if not found
        console.log('User not found, creating a new user');
        user = new UserModel({
          email,
          name,
          username: email.split('@')[0], // Set username from email
          googleUserId: id, // Store the Google User ID
          isEmailVerified: verified_email, // Email verification status
        });
      } else {
        // Update existing user details if needed
        console.log('User found, updating details');
        user.name = name || user.name;
        user.googleUserId = id || user.googleUserId; // Update Google User ID if needed
        user.isEmailVerified = verified_email; // Ensure the email verification status is updated
        user.username = email.split('@')[0]; // Update the username from the email
      }

      // Save the user to the database
      await user.save();

      console.log('User saved/updated:', user);

      // Return the user data
      //   return {
      //     email: user.email,
      //     name: user.name,
      //     googleUserId: user.googleUserId,
      //     isEmailVerified: user.isEmailVerified,
      //     username: user.username,
      //   };
      const token = Jwt.sign({ email: user.email }, JWT_SECRET, {
        expiresIn: '7d',
      });

      // Return the JWT token to the frontend
      res.status(200).json({ token });
    } catch (error) {
      console.error('Error handling Google login:', error);
      throw new HttpException(500, 'Failed to handle Google login');
    }
  }

  // Function to verify ID token using Google APIs (Optional: You can verify the ID token for extra security)
  async verifyGoogleIdToken(id_token) {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${id_token}`
      );
      return response.data;
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw new HttpException(400, 'Invalid ID token');
    }
  }

  //   async handleGoogleLogin(code) {
  //     // Exchange the authorization code for tokens
  //     // const oauthRequest = {
  //     //   url: new URL('https://oauth2.googleapis.com/token'),
  //     //   params: {
  //     //     client_id: GOOGLE_CLIENT_ID,
  //     //     client_secret: GOOGLE_CLIENT_SECRET,
  //     //     code,
  //     //     grant_type: 'authorization_code',
  //     //     redirect_uri: CALLBACK_URL,
  //     //   },
  //     // };

  //     // const accessToken = response.data.access_token;
  //     // console.log('Access Token:', accessToken);

  //     // const oauthResponse = await axios.post(oauthRequest.url.toString(), null, {
  //     //   params: oauthRequest.params,
  //     // });

  //     const response = await axios.post('https://oauth2.googleapis.com/token', {
  //       code,
  //       client_id: GOOGLE_CLIENT_ID,
  //       client_secret: GOOGLE_CLIENT_SECRET,
  //       grant_type: 'authorization_code',
  //       redirect_uri: CALLBACK_URL,
  //     });

  //     const accessToken = response.data;
  //     console.log('Access Token here:', accessToken);

  //     // const { id_token } = response.data;

  //     // if (!id_token) {
  //     //   throw new HttpException(400, 'Invalid Google response');
  //     // }

  //     // Verify the Google ID token and get user info
  //     const userInfo = await this.verifyGoogleIdToken(accessToken);

  //     // Update or create the user in your database
  //     let user = await UserModel.findOne({ email: userInfo.email });

  //     if (!user) {
  //       // Create a new user if not found
  //       user = new UserModel({
  //         email: userInfo.email,
  //         name: userInfo.name,
  //         // username: userInfo.email.split('@')[0], // Default username
  //         // Add other default fields if needed
  //       });
  //     } else {
  //       // Update existing user details if needed
  //       user.name = userInfo.name || user.name;
  //     }

  //     user.googleVerified = userInfo.verifiedEmail;
  //     await user.save();

  //     return {
  //       email: user.email,
  //       name: user.name,
  //       googleVerified: user.googleVerified,
  //     };
  //   }

  //   async verifyGoogleIdToken(idToken) {
  //     const ticket = await client.verifyIdToken({
  //       idToken,
  //       audience: GOOGLE_CLIENT_ID,
  //     });

  //     const payload = ticket.getPayload();
  //     return {
  //       email: payload.email,
  //       name: payload.name,
  //       verifiedEmail: payload.email_verified,
  //     };
  //   }

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
