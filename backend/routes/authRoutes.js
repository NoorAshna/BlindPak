const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  initiateRegistration,
  verifyRegistration,
  loginUser,
  forgotPassword,
  resetPassword,
  getMe,
} = require('../controllers/authController');

router.post('/register/initiate', initiateRegistration);
router.post('/register/verify', verifyRegistration);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
