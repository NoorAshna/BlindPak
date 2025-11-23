const express = require('express');
const router = express.Router();
const {
  initiateRegistration,
  verifyRegistration,
  loginUser,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

router.post('/register/initiate', initiateRegistration);
router.post('/register/verify', verifyRegistration);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
