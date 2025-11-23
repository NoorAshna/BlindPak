const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 }, // Expires in 10 minutes
  tempUserData: { type: Object, default: null } // Store hashed password, name, etc. temporarily
});

module.exports = mongoose.model('Otp', otpSchema);
