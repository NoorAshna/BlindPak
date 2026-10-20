const { Post, Comment, User, Notification } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const {
  sendNotificationToUser,
  emitPostLikesUpdate,
  emitPostCommentAdded,
} = require('../utils/socket');

// ── Helper: Parse @mentions from text and create notifications ────────────────
async function createMentionNotifications({ text, actorId, postId, commentId }) {
  // Extract unique @username mentions  e.g. @BraveTiger123
  const mentionRegex = /@([A-Za-z0-9]+)/g;
  const matches = [...text.matchAll(mentionRegex)];
  if (!matches.length) return;

  const mentionedNames = [...new Set(matches.map((m) => m[1]))];

  // Find matching users by name (case-insensitive)
  const mentionedUsers = await User.findAll({
    where: {
      name: { [Op.iLike]: { [Op.any]: mentionedNames } },
      _id: { [Op.ne]: actorId }, // don't notify yourself
    },
    attributes: ['_id', 'name'],
  });

  const actor = await User.findByPk(actorId, { attributes: ['_id', 'name', 'university', 'role'] });

  const notifications = mentionedUsers.map((u) => ({
    _id: uuidv4(),
    recipientId: u._id,
    actorId,
    type: 'mention',
    postId,
    commentId,
    message: `${actor?.name || 'Someone'} mentioned you in a comment`,
  }));

  if (notifications.length) {
    await Notification.bulkCreate(notifications, { ignoreDuplicates: true });
    
    // Broadcast via socket to each mentioned user's room
    for (const notif of notifications) {
      sendNotificationToUser(notif.recipientId, {
        ...notif,
        actor: actor ? actor.toJSON() : null,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Create a post
// @route   POST /api/posts
// @access  Private (Student and Admin)
// ────────────────────────────────────────────────────────────────────────────────
const createPost = async (req, res) => {
  if (req.user.role !== 'student' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only students and admins can post' });
  }

  const { content, title } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Post content is required' });
  }

  try {
    const post = await Post.create({
      _id: uuidv4(),
      userId: req.user._id,
      title: title || null,
      content,
      likes: [],
    });

    // Fetch the newly created post with associated user attributes for full frontend compatibility
    const fullPost = await Post.findByPk(post._id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['_id', 'name', 'university', 'role'],
        },
      ],
    });

    const postObj = fullPost.toJSON();
    postObj.commentCount = 0;
    postObj.userId = postObj.user;

    res.status(201).json({ ...postObj, message: 'Post created successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Get all posts (cursor-paginated)
// @route   GET /api/posts
// @access  Public
// ────────────────────────────────────────────────────────────────────────────────
const getPosts = async (req, res) => {
  try {
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 50)
      : 10;
    const cursor = req.query.cursor ? Buffer.from(req.query.cursor, 'base64url').toString('utf8') : null;
    let cursorDate;
    let cursorId;

    if (cursor) {
      [cursorDate, cursorId] = cursor.split('|');
      if (!cursorDate || !cursorId || Number.isNaN(new Date(cursorDate).getTime())) {
        return res.status(400).json({ message: 'Invalid posts cursor' });
      }
    }

    const posts = await Post.findAll({
      where: cursorDate ? {
        [Op.or]: [
          { createdAt: { [Op.lt]: new Date(cursorDate) } },
          {
            createdAt: new Date(cursorDate),
            _id: { [Op.lt]: cursorId }
          }
        ]
      } : undefined,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['_id', 'name', 'university', 'role']
        },
      ],
      order: [['createdAt', 'DESC'], ['_id', 'DESC']],
      limit: limit + 1
    });

    const hasMore = posts.length > limit;
    const pagePosts = hasMore ? posts.slice(0, limit) : posts;
    const commentCounts = pagePosts.length
      ? await Comment.count({
          where: { postId: { [Op.in]: pagePosts.map(post => post._id) } },
          group: ['postId']
        })
      : [];
    const commentCountByPost = commentCounts.reduce((counts, item) => {
      counts[item.postId] = Number(item.count);
      return counts;
    }, {});

    const formattedPosts = pagePosts.map(post => {
      const p = post.toJSON();
      p.commentCount = commentCountByPost[p._id] || 0;
      p.userId = p.user;
      return p;
    });

    const lastPost = pagePosts[pagePosts.length - 1];
    const nextCursor = hasMore && lastPost
      ? Buffer.from(`${lastPost.createdAt.toISOString()}|${lastPost._id}`).toString('base64url')
      : null;

    res.json({ posts: formattedPosts, nextCursor, hasMore });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Like / unlike a post (toggle)
// @route   POST /api/posts/:id/like
// @access  Private
// ────────────────────────────────────────────────────────────────────────────────
const likePost = async (req, res) => {
  if (req.user.role !== 'student' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only students and admins can like posts' });
  }

  try {
    const post = await Post.findByPk(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    let likes = Array.isArray(post.likes) ? [...post.likes] : [];

    if (likes.includes(req.user._id)) {
      likes = likes.filter((id) => id !== req.user._id);
    } else {
      likes.push(req.user._id);

      // Notify post owner (don't block)
      if (post.userId !== req.user._id) {
        try {
          const actor = await User.findByPk(req.user._id, { attributes: ['_id', 'name', 'university', 'role'] });
          const newNotif = await Notification.create({
            _id: uuidv4(),
            recipientId: post.userId,
            actorId: req.user._id,
            type: 'like',
            postId: post._id,
            commentId: null,
            message: `${actor?.name || 'Someone'} liked your post`,
          });
          sendNotificationToUser(post.userId, {
            ...newNotif.toJSON(),
            actor: actor ? actor.toJSON() : null,
          });
        } catch (_) { /* non-critical */ }
      }
    }

    post.likes = likes;
    await post.save();

    // Broadcast updated likes in real-time to everyone viewing this post's room
    emitPostLikesUpdate(post._id, post.likes);

    res.json(post.likes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Comment on a post
// @route   POST /api/posts/:id/comment
// @access  Private
// ────────────────────────────────────────────────────────────────────────────────
const commentPost = async (req, res) => {
  const { text } = req.body;

  if (req.user.role !== 'student' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only students and admins can comment on posts' });
  }

  if (!text || !text.trim()) {
    return res.status(400).json({ message: 'Comment text is required' });
  }

  try {
    const post = await Post.findByPk(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = await Comment.create({
      _id: uuidv4(),
      postId: req.params.id,
      userId: req.user._id,
      text,
    });

    const fullComment = await Comment.findByPk(comment._id, {
      include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'university', 'role'] }]
    });

    const commentObj = fullComment.toJSON();
    commentObj.userId = commentObj.user;

    // Notify post owner about new comment (if not self)
    if (post.userId !== req.user._id) {
      try {
        const newNotif = await Notification.create({
          _id: uuidv4(),
          recipientId: post.userId,
          actorId: req.user._id,
          type: 'comment',
          postId: post._id,
          commentId: comment._id,
          message: `${req.user.name} commented on your post`,
        });
        sendNotificationToUser(post.userId, {
          ...newNotif.toJSON(),
          actor: {
            _id: req.user._id,
            name: req.user.name,
            university: req.user.university,
            role: req.user.role,
          },
        });
      } catch (_) { /* non-critical */ }
    }

    // Parse @mentions and create mention notifications
    try {
      await createMentionNotifications({
        text,
        actorId: req.user._id,
        postId: post._id,
        commentId: comment._id,
      });
    } catch (_) { /* non-critical */ }

    // Broadcast new comment and current total count to post room
    try {
      const commentCount = await Comment.count({ where: { postId: post._id } });
      emitPostCommentAdded(post._id, commentObj, commentCount);
    } catch (_) { /* non-critical */ }

    res.status(201).json(commentObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Get comments for a post (cursor-paginated)
// @route   GET /api/posts/:id/comments
// @access  Public
// ────────────────────────────────────────────────────────────────────────────────
const getComments = async (req, res) => {
  try {
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 50)
      : 10;
    const cursor = req.query.cursor ? Buffer.from(req.query.cursor, 'base64url').toString('utf8') : null;
    let cursorDate;
    let cursorId;

    if (cursor) {
      [cursorDate, cursorId] = cursor.split('|');
      if (!cursorDate || !cursorId || Number.isNaN(new Date(cursorDate).getTime())) {
        return res.status(400).json({ message: 'Invalid comments cursor' });
      }
    }

    const comments = await Comment.findAll({
      where: {
        postId: req.params.id,
        ...(cursorDate ? {
          [Op.or]: [
            { createdAt: { [Op.gt]: new Date(cursorDate) } },
            {
              createdAt: new Date(cursorDate),
              _id: { [Op.gt]: cursorId }
            }
          ]
        } : {})
      },
      order: [['createdAt', 'ASC'], ['_id', 'ASC']],
      limit: limit + 1,
      include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'university', 'role'] }]
    });

    const hasMore = comments.length > limit;
    const pageComments = hasMore ? comments.slice(0, limit) : comments;
    const formattedComments = pageComments.map(c => {
      const cObj = c.toJSON();
      cObj.userId = cObj.user;
      return cObj;
    });

    const lastComment = pageComments[pageComments.length - 1];
    const nextCursor = hasMore && lastComment
      ? Buffer.from(`${lastComment.createdAt.toISOString()}|${lastComment._id}`).toString('base64url')
      : null;

    res.json({ comments: formattedComments, nextCursor, hasMore });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Get post by ID
// @route   GET /api/posts/:id
// @access  Public
// ────────────────────────────────────────────────────────────────────────────────
const getPostById = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id, {
      include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'university', 'role'] }]
    });

    if (post) {
      const postObj = post.toJSON();
      postObj.userId = postObj.user;
      res.json(postObj);
    } else {
      res.status(404).json({ message: 'Post not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Update own post
// @route   PUT /api/posts/:id
// @access  Private (owner only)
// ────────────────────────────────────────────────────────────────────────────────
const updatePost = async (req, res) => {
  const { content, title } = req.body;

  try {
    const post = await Post.findByPk(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.userId !== req.user._id) {
      return res.status(403).json({ message: 'Not authorised to edit this post' });
    }

    post.title = title !== undefined ? (title || null) : post.title;
    post.content = content ?? post.content;
    await post.save();

    res.json({ ...post.toJSON(), message: 'Post updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// @desc    Delete own post
// @route   DELETE /api/posts/:id
// @access  Private (owner only)
// ────────────────────────────────────────────────────────────────────────────────
const deleteOwnPost = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.userId !== req.user._id) {
      return res.status(403).json({ message: 'Not authorised to delete this post' });
    }

    await Comment.destroy({ where: { postId: post._id } });
    await post.destroy();

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPost,
  getPosts,
  likePost,
  commentPost,
  getComments,
  getPostById,
  updatePost,
  deleteOwnPost
};
