const { User, Post, Comment, Follow, Notification } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sendNotificationToUser } = require('../utils/socket');
const { parseDeviceInfo } = require('../utils/deviceInfo');
const { audit } = require('../utils/audit');

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Get public profile of a user by ID
// @route   GET /api/users/:id
// @access  Public
// ────────────────────────────────────────────────────────────────────────────────
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['_id', 'name', 'role', 'university', 'bio', 'createdAt'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Counts
    const [followersCount, followingCount, postCount] = await Promise.all([
      Follow.count({ where: { followingId: req.params.id } }),
      Follow.count({ where: { followerId: req.params.id } }),
      Post.count({ where: { userId: req.params.id } }),
    ]);

    // Is the requesting user already following?
    let isFollowing = false;
    if (req.user) {
      const existing = await Follow.findOne({
        where: { followerId: req.user._id, followingId: req.params.id },
      });
      isFollowing = !!existing;
    }

    res.json({
      ...user.toJSON(),
      followersCount,
      followingCount,
      postCount,
      isFollowing,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Get posts by a specific user (public)
// @route   GET /api/users/:id/posts
// @access  Public
// ────────────────────────────────────────────────────────────────────────────────
const getUserPosts = async (req, res) => {
  try {
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 50)
      : 10;

    const cursor = req.query.cursor
      ? Buffer.from(req.query.cursor, 'base64url').toString('utf8')
      : null;

    let whereClause = { userId: req.params.id };

    if (cursor) {
      const [cursorDate, cursorId] = cursor.split('|');
      if (!cursorDate || !cursorId || Number.isNaN(new Date(cursorDate).getTime())) {
        return res.status(400).json({ message: 'Invalid cursor' });
      }
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { createdAt: { [Op.lt]: new Date(cursorDate) } },
          { createdAt: new Date(cursorDate), _id: { [Op.lt]: cursorId } },
        ],
      };
    }

    const posts = await Post.findAll({
      where: whereClause,
      include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'university', 'role'] }],
      order: [['createdAt', 'DESC'], ['_id', 'DESC']],
      limit: limit + 1,
    });

    const hasMore = posts.length > limit;
    const pagePosts = hasMore ? posts.slice(0, limit) : posts;

    const commentCounts = pagePosts.length
      ? await Comment.count({
          where: { postId: { [Op.in]: pagePosts.map((p) => p._id) } },
          group: ['postId'],
        })
      : [];

    const countByPost = commentCounts.reduce((acc, item) => {
      acc[item.postId] = Number(item.count);
      return acc;
    }, {});

    const formatted = pagePosts.map((post) => {
      const p = post.toJSON();
      p.commentCount = countByPost[p._id] || 0;
      p.userId = p.user;
      return p;
    });

    const lastPost = pagePosts[pagePosts.length - 1];
    const nextCursor =
      hasMore && lastPost
        ? Buffer.from(`${lastPost.createdAt.toISOString()}|${lastPost._id}`).toString('base64url')
        : null;

    res.json({ posts: formatted, nextCursor, hasMore });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Follow / Unfollow a user (toggle)
// @route   POST /api/users/:id/follow
// @access  Private (students & admins)
// ────────────────────────────────────────────────────────────────────────────────
const toggleFollow = async (req, res) => {
  if (req.user.role !== 'student' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only students and admins can follow users' });
  }

  if (req.user._id === req.params.id) {
    return res.status(400).json({ message: 'You cannot follow yourself' });
  }

  try {
    const target = await User.findByPk(req.params.id, {
      attributes: ['_id', 'name'],
    });

    if (!target) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existing = await Follow.findOne({
      where: { followerId: req.user._id, followingId: req.params.id },
    });

    if (existing) {
      // Unfollow
      await existing.destroy();
      // Audit: unfollow
      audit({ userId: req.user._id, resource: 'USER', action: 'UNFOLLOW', targetId: req.params.id, deviceInfo: parseDeviceInfo(req) });
      return res.json({ following: false, message: `Unfollowed ${target.name}` });
    }

    // Follow
    await Follow.create({
      _id: uuidv4(),
      followerId: req.user._id,
      followingId: req.params.id,
    });

    // Create notification for the target user (don't block on failure)
    try {
      const newNotif = await Notification.create({
        _id: uuidv4(),
        recipientId: req.params.id,
        actorId: req.user._id,
        type: 'follow',
        postId: null,
        commentId: null,
        message: `${req.user.name} started following you`,
      });
      sendNotificationToUser(req.params.id, {
        ...newNotif.toJSON(),
        actor: {
          _id: req.user._id,
          name: req.user.name,
          university: req.user.university,
          role: req.user.role,
        },
      });
    } catch (_) { /* non-critical */ }

    // Audit: follow
    audit({ userId: req.user._id, resource: 'USER', action: 'FOLLOW', targetId: req.params.id, deviceInfo: parseDeviceInfo(req) });
    return res.json({ following: true, message: `Now following ${target.name}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Get followers list of a user
// @route   GET /api/users/:id/followers
// @access  Public
// ────────────────────────────────────────────────────────────────────────────────
const getFollowers = async (req, res) => {
  try {
    const follows = await Follow.findAll({
      where: { followingId: req.params.id },
      include: [{ model: User, as: 'follower', attributes: ['_id', 'name', 'university', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json(follows.map((f) => f.follower));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Get following list of a user
// @route   GET /api/users/:id/following
// @access  Public
// ────────────────────────────────────────────────────────────────────────────────
const getFollowing = async (req, res) => {
  try {
    const follows = await Follow.findAll({
      where: { followerId: req.params.id },
      include: [{ model: User, as: 'followed', attributes: ['_id', 'name', 'university', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json(follows.map((f) => f.followed));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Update own profile (bio)
// @route   PUT /api/users/me
// @access  Private
// ────────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  const { bio } = req.body;

  try {
    const user = await User.findByPk(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (bio !== undefined) {
      user.bio = bio.slice(0, 300); // cap at 300 chars
    }

    await user.save();
    // Audit: profile updated
    audit({ userId: req.user._id, resource: 'USER', action: 'UPDATE_PROFILE', deviceInfo: parseDeviceInfo(req) });
    res.json({
      _id: user._id,
      name: user.name,
      role: user.role,
      university: user.university,
      bio: user.bio,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Get current user's notifications
// @route   GET /api/users/notifications
// @access  Private
// ────────────────────────────────────────────────────────────────────────────────
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { recipientId: req.user._id },
      include: [
        { model: User, as: 'actor', attributes: ['_id', 'name', 'university', 'role'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 30,
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Mark notifications as read
// @route   PUT /api/users/notifications/read
// @access  Private
// ────────────────────────────────────────────────────────────────────────────────
const markNotificationsRead = async (req, res) => {
  try {
    await Notification.update(
      { read: true },
      { where: { recipientId: req.user._id, read: false } }
    );
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Search users by name (for @mention autocomplete)
// @route   GET /api/users/search?q=term
// @access  Private
// ────────────────────────────────────────────────────────────────────────────────
const searchUsers = async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) return res.json([]);

  try {
    const users = await User.findAll({
      where: {
        name: { [Op.iLike]: `%${q}%` },
        role: { [Op.in]: ['student', 'admin'] },
      },
      attributes: ['_id', 'name', 'university', 'role'],
      limit: 8,
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUserProfile,
  getUserPosts,
  toggleFollow,
  getFollowers,
  getFollowing,
  updateProfile,
  getNotifications,
  markNotificationsRead,
  searchUsers,
};
