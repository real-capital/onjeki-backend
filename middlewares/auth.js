const { default: UserModel } = require('../models/user.model');
const Jwt = require('../utils/jwt'); // Adjust the path as necessary
const { ERole } = require('./config'); // Enum or role definitions (adjust path as needed)

const isAuthenticated = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      status: 'error',
      message: 'Authentication required',
    });
  }

  try {
    const decoded = Jwt.verifyJwt(token); // Verify token and get decoded data (user info)
    const user = await UserModel.findById(decoded.id);

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
      message: 'Invalid token'
    });
  }
};

// Middleware to check the role
const hasRole = (requiredRoles) => {
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

module.exports = { isAuthenticated, hasRole };
