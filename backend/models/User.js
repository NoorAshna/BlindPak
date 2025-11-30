const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // UUID
  name: { type: String, required: true }, 
  hashedEmail: { type: String, default: null }, 
  isStudent: { type: Boolean, required: true },
  canPost: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  password: { type: String }, // For public users
  university: { type: String, default: 'General' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
