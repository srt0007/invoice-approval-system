const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { authenticate, generateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Register new user
 * POST /api/auth/register
 */
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { email, password, name } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered',
        });
      }

      // Create user
      const user = await User.create({
        email,
        password,
        name,
        apiKey: uuidv4(),
      });

      // Generate token
      const token = generateToken(user.id);

      res.status(201).json({
        success: true,
        data: {
          user: user.toJSON(),
          token,
        },
      });
    } catch (error) {
      logger.error(`Registration error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * Login
 * POST /api/auth/login
 */
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Check if active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Account is disabled',
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = generateToken(user.id);

      res.json({
        success: true,
        data: {
          user: user.toJSON(),
          token,
        },
      });
    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * Get current user
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

/**
 * Update user profile
 * PATCH /api/auth/me
 */
router.patch('/me',
  authenticate,
  [
    body('name').optional().trim().notEmpty(),
    body('webhookUrl').optional().isURL(),
    body('settings').optional().isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const updates = {};
      if (req.body.name) updates.name = req.body.name;
      if (req.body.webhookUrl) updates.webhookUrl = req.body.webhookUrl;
      if (req.body.settings) updates.settings = { ...req.user.settings, ...req.body.settings };

      await req.user.update(updates);
      const user = req.user;

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error(`Update profile error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * Regenerate API key
 * POST /api/auth/regenerate-api-key
 */
router.post('/regenerate-api-key', authenticate, async (req, res) => {
  try {
    const newApiKey = uuidv4();

    await req.user.update({ apiKey: newApiKey });

    res.json({
      success: true,
      data: {
        apiKey: newApiKey,
      },
    });
  } catch (error) {
    logger.error(`Regenerate API key error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Change password
 * POST /api/auth/change-password
 */
router.post('/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const user = await User.findByPk(req.user.id);
      const isMatch = await user.comparePassword(currentPassword);

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect',
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password updated successfully',
      });
    } catch (error) {
      logger.error(`Change password error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

module.exports = router;
