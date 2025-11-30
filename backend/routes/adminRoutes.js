const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const {
  deletePost,
  deleteComment,
  getAllUsers,
  updateUserPassword,
  deleteUser,
  getAdminStats
} = require('../controllers/adminController');

// All routes require authentication and admin privileges
router.use(protect);
router.use(adminOnly);

// Admin stats
router.get('/stats', getAdminStats);

// Post management
router.delete('/posts/:id', deletePost);

// Comment management
router.delete('/comments/:id', deleteComment);

// User management
router.get('/users', getAllUsers);
router.put('/users/:id/password', updateUserPassword);
router.delete('/users/:id', deleteUser);

module.exports = router;
