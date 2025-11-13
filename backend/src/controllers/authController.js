import User from '../models/User.js';
import { generateToken } from '../middleware/authMiddleware.js';
import { body, validationResult } from 'express-validator';

export const register = async (req, res) => {
  try {
    // Input validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, role, department, position, phone } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Validate role assignment (prevent privilege escalation)
    const requestingUser = req.user;
    if (role === 'admin' && requestingUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create admin users'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'employee',
      department,
      position,
      phone
    });

    if (user) {
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
          department: user.department,
          position: user.position,
          token: generateToken(user._id)
        }
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error in user registration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Add validation middleware
export const validateRegistration = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').isIn(['employee', 'hr', 'admin']).withMessage('Invalid role specified'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('position').trim().notEmpty().withMessage('Position is required')
];