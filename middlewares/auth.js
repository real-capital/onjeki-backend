import { StatusCodes } from 'http-status-codes';
import User from '../models/user.model.js';
import Jwt from '../utils/jwt.js'; // Adjust the path if necessary
// import { ERole } from './config.js'; // Adjust the path if necessary

export const isAuthenticated = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  console.log(token);

  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      status: 'error',
      message: 'Authentication required',
    });
  }


  try {
    const decoded = Jwt.verifyJwt(token); // Verify token and get decoded data (user info)
    console.log(decoded);
    const user = await User.findById(decoded.id);
    console.log(user);

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: 'error',
        message: 'User not found',
      });
    }

    req.user = user;

    // req.user = decoded; // Add user info to request object
    next(); // Token is valid, proceed to the next middleware or route handler
  } catch (error) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      status: 'error',
      message: 'Invalid token',
    });
  }
};

// Middleware to check the role
export const hasRole = (requiredRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole || !requiredRoles.includes(userRole)) {
      return res
        .status(403)
        .json({ error: 'You are not authorized to access this resource' });
    }

    next(); // User has the required role, proceed to the next middleware or route handler
  };
};

// module.exports = { isAuthenticated, hasRole };
