const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { signup, login, assignRole, toggleUserStatus } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Strict rate limit for login: 10 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' }
});

// Strict rate limit for signup: 5 signups per 15 minutes
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many signup attempts. Please try again in 15 minutes.' }
});

// Public routes
router.post('/signup', signupLimiter, signup);
router.post('/login', loginLimiter, login);

// Protected routes (token required)
router.put('/assign-role', authenticateToken, assignRole);
router.put('/toggle-status', authenticateToken, toggleUserStatus);

module.exports = router;