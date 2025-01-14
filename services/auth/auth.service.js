import UserModel from '../../models/user.model.js';
import OtpModel from '../../models/otp.model.js';
import otpGenerator from 'otp-generator';
import otpEmailService from '../../services/email/otpMail.service.js';
import Jwt from '../../utils/jwt.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';

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
}

export default AuthService;
