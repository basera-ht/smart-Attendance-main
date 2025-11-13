import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Generate Access Token (short-lived, 15 minutes)
const generateAccessToken = (id) => {
  return jwt.sign(
    { id, type: 'access' },
    process.env.JWT_SECRET || 'fallback-secret',
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m'
    }
  );
};

// Generate Refresh Token (long-lived, 7 days)
const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Store refresh token in database
const storeRefreshToken = async (token, userId, req) => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Revoke all previous refresh tokens for this user (optional: for single device)
    // await RefreshToken.updateMany(
    //   { user: userId, revoked: false },
    //   { revoked: true, revokedAt: new Date() }
    // );

    return await RefreshToken.create({
      token,
      user: userId,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  } catch (error) {
    console.error('Error storing refresh token:', error);
    // Don't throw error - allow login to continue even if refresh token storage fails
    // This ensures login works even if there's a database issue with refresh tokens
    return null;
  }
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'hr', 'employee']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, role = 'employee', department, position, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      department,
      position,
      phone
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();

    // Store refresh token (non-blocking - registration succeeds even if this fails)
    try {
      await storeRefreshToken(refreshToken, user._id, req);
    } catch (tokenStoreError) {
      console.error('Failed to store refresh token, but registration continues:', tokenStoreError);
      // Continue with registration even if refresh token storage fails
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
          department: user.department,
          position: user.position
        },
        accessToken,
        refreshToken // Still return refresh token even if storage failed
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();

    // Store refresh token (non-blocking - login succeeds even if this fails)
    try {
      await storeRefreshToken(refreshToken, user._id, req);
    } catch (tokenStoreError) {
      console.error('Failed to store refresh token, but login continues:', tokenStoreError);
      // Continue with login even if refresh token storage fails
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
          department: user.department,
          position: user.position,
          lastLogin: user.lastLogin
        },
        accessToken,
        refreshToken // Still return refresh token even if storage failed
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('phone').optional().trim(),
  body('address').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, phone, address } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token using refresh token
// @access  Public
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { refreshToken } = req.body;

    // Find refresh token in database
    const storedToken = await RefreshToken.findOne({
      token: refreshToken,
      revoked: false
    }).populate('user');

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      // Mark as revoked
      storedToken.revoked = true;
      storedToken.revokedAt = new Date();
      await storedToken.save();

      return res.status(401).json({
        success: false,
        message: 'Refresh token expired'
      });
    }

    // Check if user is still active
    if (!storedToken.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(storedToken.user._id);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user and revoke refresh token
// @access  Private
router.post('/logout', authenticate, [
  body('refreshToken').optional().notEmpty().withMessage('Refresh token is required')
], async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke the refresh token
      await RefreshToken.updateOne(
        { token: refreshToken, user: req.user._id },
        { revoked: true, revokedAt: new Date() }
      );
    } else {
      // Revoke all refresh tokens for this user
      await RefreshToken.updateMany(
        { user: req.user._id, revoked: false },
        { revoked: true, revokedAt: new Date() }
      );
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

// @route   GET /api/auth/tokens
// @desc    Get all active refresh tokens for current user
// @access  Private
router.get('/tokens', authenticate, async (req, res) => {
  try {
    const tokens = await RefreshToken.find({
      user: req.user._id,
      revoked: false,
      expiresAt: { $gt: new Date() }
    }).select('ipAddress userAgent createdAt expiresAt');

    res.json({
      success: true,
      data: {
        tokens
      }
    });
  } catch (error) {
    console.error('Get tokens error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tokens'
    });
  }
});

export default router;