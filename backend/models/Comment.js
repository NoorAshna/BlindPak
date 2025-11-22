const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // UUID
  postId: { type: String, required: true, ref: 'Post' },
  userId: { type: String, required: true, ref: 'User' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema);
