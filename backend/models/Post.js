const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  _id: { type: String, required: true }, 
  userId: { type: String, required: true, ref: 'User' },
  content: { type: String, required: true },
  imageUrl: { type: String, default: null },
  imageId: { type: String, default: null }, 
  likes: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
