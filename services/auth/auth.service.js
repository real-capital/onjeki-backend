import axios from 'axios';
import UserModel from '../../models/user.model.js';
import OtpModel from '../../models/otp.model.js';
import cloudinary from '../../config/cloudinary.js';
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
import { Vonage } from '@vonage/server-sdk';
import { SMS } from '@vonage/messages';
import UserVerification from '../../models/userVerification.model.js';
import PropertyModel from '../../models/properties.model.js';
import { EListStatus } from '../../enum/house.enum.js';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const vonage = new Vonage({
  apiKey: process.env.NEXMO_API_KEY,
  apiSecret: process.env.NEXMO_API_SECRET,
});
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
    user.isEmailVerified = true;
    await user.save();

    return { token, user, needsName: !user.name };
  }

  async getUser(userId) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'User Not Found');
      }
      return user;
    } catch (error) {
      throw new HttpException(
        error.statusCode || StatusCodes.BAD_REQUEST,
        error.message
      );
    }
  }

  async updateUserName(name, userId) {
    try {
      const user = await UserModel.findById(userId);
      console.log(user);
      if (!user) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'User not found');
      }

      user.name = name;
      await user.save();

      return user;
    } catch (error) {
      throw new HttpException(
        error.statusCode || StatusCodes.BAD_REQUEST,
        error.message
      );
    }
  }

  async updatePersonalInfo(userId, updateData) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'User not found');
      }

      // Define allowed fields for update
      const allowedFields = ['name', 'username', 'address', 'dateOfBirth'];
      const updateFields = {};

      // Only update allowed fields that are provided
      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field];
        }
      });

      // Handle preferred name (username) specifically
      if (updateData.preferredName !== undefined) {
        updateFields.username = updateData.preferredName;
      }

      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true, runValidators: true }
      );

      return updatedUser;
    } catch (error) {
      throw new HttpException(
        error.statusCode || StatusCodes.BAD_REQUEST,
        error.message
      );
    }
  }

  async updateEmail(userId, newEmail) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'User not found');
      }

      // Check if email is already in use by another user
      const existingUser = await UserModel.findOne({
        email: newEmail.toLowerCase(),
        _id: { $ne: userId },
      });

      if (existingUser) {
        throw new HttpException(
          StatusCodes.CONFLICT,
          'Email is already in use'
        );
      }

      // If email is different, require verification
      if (user.email !== newEmail.toLowerCase()) {
        // Generate OTP for email verification
        const otp = otpGenerator.generate(6, {
          digits: true,
          upperCaseAlphabets: false,
          lowerCaseAlphabets: false,
          specialChars: false,
        });

        const otpExpiration = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        const otpRecord = new OtpModel({
          userId: user._id,
          otp,
          expiration: otpExpiration,
          // purpose: 'email_update',
          newEmail: newEmail.toLowerCase(),
        });

        await otpRecord.save();

        // Send OTP to new email
        await otpEmailService.sendOtp(newEmail, otp);

        return {
          message: 'OTP sent to new email address for verification',
          requiresVerification: true,
        };
      }

      return {
        message: 'Email is the same as current email',
        requiresVerification: false,
      };
    } catch (error) {
      throw new HttpException(
        error.statusCode || StatusCodes.BAD_REQUEST,
        error.message
      );
    }
  }

  async updatePhoneNumber(userId, phoneNumber) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'User not found');
      }

      // Update phone number and reset verification status if changed
      const updateData = { phoneNumber };
      if (user.phoneNumber !== phoneNumber) {
        updateData.isPhoneVerified = false;
      }

      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      return updatedUser;
    } catch (error) {
      throw new HttpException(
        error.statusCode || StatusCodes.BAD_REQUEST,
        error.message
      );
    }
  }

  // Also fix your updateUserImage method (there's a bug in the await)
  async updateUserImage(userId, imageFile) {
    const MAX_RETRY_ATTEMPTS = 3;
    try {
      let user = await UserModel.findById(userId);
      if (!user) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'User not found');
      }
      if (!imageFile) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'Image file not found');
      }

      let result;
      let retryAttempts = 0;

      while (retryAttempts < MAX_RETRY_ATTEMPTS) {
        try {
          console.log(`Uploading image... ${imageFile}`);
          const fileBuffer = imageFile.buffer;

          const fileString = fileBuffer.toString('base64');
          result = await cloudinary.uploader.upload(
            `data:image/jpeg;base64,${fileString}`,
            {
              folder: 'avatars',
            }
          );

          break;
        } catch (uploadError) {
          console.error('Upload attempt failed:', uploadError);
          retryAttempts++;

          if (retryAttempts >= MAX_RETRY_ATTEMPTS) {
            throw new HttpException(
              StatusCodes.INTERNAL_SERVER_ERROR,
              'Failed to upload image after multiple attempts'
            );
          }
          console.log(
            `Retrying upload... Attempt ${retryAttempts} of ${MAX_RETRY_ATTEMPTS}`
          );
        }
      }

      // Fix: Add await here
      user = await UserModel.findOneAndUpdate(
        { _id: userId },
        {
          $set: {
            'profile.photo': result.secure_url,
          },
        },
        { new: true }
      );

      return user;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new HttpException(
        error.statusCode || StatusCodes.BAD_REQUEST,
        error.message
      );
    }
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

  async sendPhoneOtp(userId, phoneNumber) {
    try {
      // Find the user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'User not found');
      }
      // Mark phone as verified
      await UserModel.findByIdAndUpdate(userId, {
        phoneNumber: phoneNumber,
      });

      // Validate phone number
      if (!phoneNumber) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Phone number is required'
        );
      }

      // Generate OTP
      const otp = otpGenerator.generate(6, {
        digits: true,
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });

      // Create OTP record in database

      await OtpModel.create({
        userId,
        otp,
        expiration: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes expiry
      });

      // Send OTP via SMS
      const response = await vonage.messages.send(
        new SMS(
          `Your Onjeki verification code is ${otp}. \n Do not share this with anyone.`,
          phoneNumber,
          'Onjeki'
        )
      );

      return {
        message: 'OTP sent successfully',
        requestId: response,
      };
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw new HttpException(StatusCodes.BAD_REQUEST, 'Failed to send OTP');
    }
  }

  // Verify OTP
  async verifyPhoneOtp(userId, otp, phoneNumber) {
    console.log(userId);
    console.log(otp);
    console.log(phoneNumber);
    try {
      // Find the user
      const user = await UserModel.findOne({ phoneNumber: phoneNumber });
      if (!user) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'User not found');
      }

      // Find the OTP record
      const otpRecord = await OtpModel.findOne({
        userId,
        otp: otp,
        // expiration: { $gt: new Date() }, // Check if OTP is not expired
      });
      console.log(otpRecord);

      // const otpRecord = await OtpModel.findById(user.otp);
      if (!otpRecord) {
        throw new HttpException(StatusCodes.BAD_REQUEST, 'Invalid OTP');
      }

      if (otpRecord.otp !== otp) {
        throw new HttpException(StatusCodes.BAD_REQUEST, 'Incorrect OTP');
      }

      if (new Date() > otpRecord.expiration) {
        throw new HttpException(StatusCodes.BAD_REQUEST, 'OTP has expired');
      }

      // Find or create verification record
      let verification = await UserVerification.findOne({ userId });
      if (!verification) {
        verification = new UserVerification({ userId });
      }

      // Mark phone as verified
      await UserModel.findByIdAndUpdate(userId, {
        isPhoneVerified: true,
      });
      verification.phoneVerification = {
        isVerified: true,
        verifiedAt: new Date(),
      };

      // Update status
      if (
        verification.legalNameVerification.isVerified == true &&
        verification.addressVerification.isVerified == true
      ) {
        verification.status = 'fully_verified';
        user.verification_status = 'verified';
        // await this.publishUserListings(userId);
      } else {
        verification.status = 'partially_verified';
        user.verification_status = 'partially';
      }

      // Save verification record
      await user.save();
      await verification.save();

      // Publish all user's unpublished listings
      if (verification.status == 'fully_verified') {
        await this.publishUserListings(userId);
      }
      // await this.publishUserListings(userId);

      // Delete the used OTP record
      await OtpModel.deleteOne({ _id: otpRecord._id });

      return {
        message: 'Phone number verified successfully',
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        error.message || 'Error Verifying OTP. Please try again later.'
      );
    }
  }

  // Verify Legal Name
  async verifyLegalName(userId, verificationData) {
    try {
      // Validate input
      const { documentType, documentNumber, fullName } = verificationData;

      if (!documentType || !documentNumber || !fullName) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Missing required verification details'
        );
      }

      // Find or create verification record
      let verification = await UserVerification.findOne({ userId });
      if (!verification) {
        verification = new UserVerification({ userId });
      }

      // Update legal name verification
      verification.legalNameVerification = {
        isVerified: true,
        verifiedAt: new Date(),
        documentType,
        documentNumber,
      };

      // Update user's full name
      await UserModel.findByIdAndUpdate(userId, {
        name: fullName.trim(),
      });

      // Save verification record
      await verification.save();

      return {
        message: 'Legal name verified successfully',
        status: verification.status,
      };
    } catch (error) {
      console.error('Legal name verification error:', error);
      throw error;
    }
  }

  // Verify Address
  async verifyAddress(userId, verificationData) {
    try {
      const { proofType, address } = verificationData;

      if (!proofType || !address) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Missing required address verification details'
        );
      }

      // Find or create verification record
      let verification = await UserVerification.findOne({ userId });
      if (!verification) {
        verification = new UserVerification({ userId });
      }

      // Update address verification
      verification.addressVerification = {
        isVerified: true,
        verifiedAt: new Date(),
        proofType,
      };

      // Update user's address
      await UserModel.findByIdAndUpdate(userId, {
        address: address,
      });

      // Save verification record
      await verification.save();

      return {
        message: 'Address verified successfully',
        status: verification.status,
      };
    } catch (error) {
      console.error('Address verification error:', error);
      throw error;
    }
  }
  // Self-Declaration Verification
  async selfDeclareVerification(userId, fullName, address) {
    try {
      // const { fullName, address } = verificationData;
      let user = await UserModel.findById(userId);
      if (!user) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'User not found');
      }
      // Validate input
      if (!fullName || !address) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Full name and address are required'
        );
      }

      // Find or create verification record
      let verification = await UserVerification.findOne({ userId });
      if (!verification) {
        verification = new UserVerification({ userId });
      }

      // Update verification details
      verification.verificationMethod = 'self_declaration';

      // Verify Legal Name
      verification.legalNameVerification = {
        isVerified: true,
        verifiedAt: new Date(),
        method: 'self_declaration',
      };

      // Verify Address
      verification.addressVerification = {
        isVerified: true,
        verifiedAt: new Date(),
        method: 'self_declaration',
      };

      // Update user profile
      user.name = fullName;
      user.address = address;
      user.isLegalNameVerified = true;
      user.isAddressVerified = true;
      // await UserModel.findByIdAndUpdate(userId, {
      //   name: fullName,
      //   address: address,
      //   isLegalNameVerified: true,
      //   isAddressVerified: true,
      // });

      // Update status
      if (verification.phoneVerification.isVerified == true) {
        verification.status = 'fully_verified';
        user.verification_status = 'verified';
        // await this.publishUserListings(userId);
      } else {
        verification.status = 'partially_verified';
        user.verification_status = 'partially';
      }

      // Save verification record
      await verification.save();
      await user.save();
      if (verification.status == 'fully_verified') {
        await this.publishUserListings(userId);
      }

      return {
        message: 'Details verified successfully',
        status: verification.status,
      };
    } catch (error) {
      console.error('Self-declaration verification error:', error);
      throw error;
    }
  }

  // Document-based Verification
  async documentVerification(userId, verificationData, documents) {
    try {
      const { fullName, address } = verificationData;

      // Validate input
      if (!fullName || !address || !documents || documents.length === 0) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Full details and documents are required'
        );
      }

      // Find or create verification record
      let verification = await UserVerification.findOne({ userId });
      if (!verification) {
        verification = new UserVerification({ userId });
      }

      // Update verification method
      verification.verificationMethod = 'document';

      // Process uploaded documents
      const processedDocuments = documents.map((doc) => ({
        type: doc.type,
        documentType: doc.documentType,
        documentNumber: doc.documentNumber,
        documentImageUrl: doc.documentImageUrl,
        issuedBy: doc.issuedBy,
        expiryDate: doc.expiryDate,
      }));

      // Add documents to verification record
      verification.verificationDocuments = processedDocuments;

      // Verify Legal Name
      verification.legalNameVerification = {
        isVerified: true,
        verifiedAt: new Date(),
        method: 'document',
      };

      // Verify Address
      verification.addressVerification = {
        isVerified: true,
        verifiedAt: new Date(),
        method: 'document',
      };

      // Update user profile
      await UserModel.findByIdAndUpdate(userId, {
        fullName: fullName.trim(),
        address: address,
      });

      // Update status
      verification.status = 'fully_verified';

      // Save verification record
      await verification.save();

      return {
        message: 'Verification completed successfully',
        status: verification.status,
      };
    } catch (error) {
      console.error('Document verification error:', error);
      throw error;
    }
  }

  // Check Verification Status
  async getVerificationStatus(userId) {
    const verification = await UserVerification.findOne({ userId });

    if (!verification) {
      return {
        status: 'not_started',
        canPublishListings: false,
      };
    }

    // Define listing publication rules
    const canPublishListings =
      verification.legalNameVerification.isVerified == true &&
      verification.addressVerification.isVerified == true &&
      verification.phoneVerification.isVerified == true;
    console.log('canPublishListings');
    console.log(canPublishListings);
    return {
      status: verification.status,
      verificationMethod: verification.verificationMethod,
      legalNameVerified: verification.legalNameVerification.isVerified,
      addressVerified: verification.addressVerification.isVerified,
      phoneVerified: verification.phoneVerification.isVerified,
      canPublishListings,
    };
  }

  // Publish all user's listings
  async publishUserListings(userId) {
    try {
      // Check verification status
      const verificationStatus = await this.getVerificationStatus(userId);
      // Check if user can publish listings
      if (!verificationStatus.canPublishListings) {
        throw new HttpException(
          StatusCodes.FORBIDDEN,
          'Verification is incomplete. Please complete verification steps.'
        );
      }

      // Update all unpublished properties of the user to published
      const result = await PropertyModel.updateMany(
        {
          owner: userId,
          listStatus: EListStatus.UNDER_REVIEW, // Assuming you have a draft status
        },
        {
          listStatus: EListStatus.APPROVED,
        }
      );

      console.log(
        `Published ${result.modifiedCount} listings for user ${userId}`
      );
      return {
        message: 'Listings published successfully',
        publishedCount: result.modifiedCount,
      };
    } catch (error) {
      console.error('Error publishing listings:', error);
      // Don't rethrow to prevent blocking phone verification
    }
  }
}

export default AuthService;
