const express = require('express');
const router = express.Router();
const {
  sendStudentOTP,
  verifyStudentOTP,
  registerPublic,
  loginPublic
} = require('../controllers/authController');

router.post('/student/send-otp', sendStudentOTP);
router.post('/student/verify-otp', verifyStudentOTP);
router.post('/register', registerPublic);
router.post('/login', loginPublic);

module.exports = router;
