const express = require('express');
const router = express.Router();
const { signup, login, assignRole, toggleUserStatus } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.put('/assign-role', authenticateToken, assignRole);
router.put('/toggle-status', authenticateToken, toggleUserStatus);

module.exports = router;