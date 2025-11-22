const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // UUID
  userId: { type: String, required: true, ref: 'User' },
  content: { type: String, required: true },
  imageUrl: { type: String, default: null },
  imageId: { type: String, default: null }, // Cloudinary ID
  likes: [{ type: String }], // Array of User UUIDs
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
