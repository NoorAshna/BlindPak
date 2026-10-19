const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const {
  getUserProfile,
  getUserPosts,
  toggleFollow,
  getFollowers,
  getFollowing,
  updateProfile,
  getNotifications,
  markNotificationsRead,
  searchUsers,
} = require('../controllers/userController');

// Search (must be before /:id routes to avoid route conflict)
router.get('/search', protect, searchUsers);

// Notifications (authenticated)
router.get('/notifications', protect, getNotifications);
router.put('/notifications/read', protect, markNotificationsRead);

// Current user profile update
router.put('/me', protect, updateProfile);

// Public profile & user posts
router.get('/:id', optionalProtect, getUserProfile);
router.get('/:id/posts', getUserPosts);

// Follow/Unfollow
router.post('/:id/follow', protect, toggleFollow);

// Followers / Following lists
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);

module.exports = router;
