const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { deleteImage } = require('../utils/cloudinary');

// @desc    Delete a post (Admin only)
// @route   DELETE /api/admin/posts/:id
// @access  Private/Admin
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Delete image from Cloudinary if exists
    if (post.imageId) {
      await deleteImage(post.imageId);
    }

    // Delete associated comments
    await Comment.deleteMany({ postId: req.params.id });

    // Delete the post
    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: 'Post and associated comments deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a comment (Admin only)
// @route   DELETE /api/admin/comments/:id
// @access  Private/Admin
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    await Comment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      users,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user password (Admin only)
// @route   PUT /api/admin/users/:id/password
// @access  Private/Admin
const updateUserPassword = async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ message: 'New password is required' });
  }

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a user (Admin only)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting yourself
    if (req.user._id === req.params.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Optional: Delete user's posts and comments (cascade delete)
    const cascadeDelete = req.query.cascade === 'true';

    if (cascadeDelete) {
      // Get all user's posts to delete associated images
      const userPosts = await Post.find({ userId: req.params.id });
      
      // Delete images from Cloudinary
      for (const post of userPosts) {
        if (post.imageId) {
          await deleteImage(post.imageId);
        }
      }

      // Delete all user's posts
      await Post.deleteMany({ userId: req.params.id });

      // Delete all user's comments
      await Comment.deleteMany({ userId: req.params.id });
    }

    // Delete the user
    await User.findByIdAndDelete(req.params.id);

    res.json({ 
      message: 'User deleted successfully',
      cascadeDelete 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get admin stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalComments = await Comment.countDocuments();
    const totalStudents = await User.countDocuments({ isStudent: true });
    const totalPublicUsers = await User.countDocuments({ isStudent: false });

    res.json({
      totalUsers,
      totalPosts,
      totalComments,
      totalStudents,
      totalPublicUsers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  deletePost,
  deleteComment,
  getAllUsers,
  updateUserPassword,
  deleteUser,
  getAdminStats
};
