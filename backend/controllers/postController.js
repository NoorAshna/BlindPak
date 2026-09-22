const { Post, Comment, User } = require('../models');
const { Op } = require('sequelize');
const { uploadImage } = require('../utils/cloudinary');
const { v4: uuidv4 } = require('uuid');

// @desc    Create a post
// @route   POST /api/posts
// @access  Private (Student and Admin)
const createPost = async (req, res) => {
  if (req.user.role !== 'student' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only students and admins can post' });
  }

  const { content, title } = req.body;
  let imageUrl = null;
  let imageId = null;
 
  try {
    if (req.file) {
      const result = await uploadImage(req.file.path);
      imageUrl = result.secure_url;
      imageId = result.public_id;
    }

    const post = await Post.create({
      _id: uuidv4(),
      userId: req.user._id,
      title: title || null,
      content,
      imageUrl,
      imageId,
      likes: []
    });

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all posts
// @route   GET /api/posts
// @access  Public
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

// @desc    Like a post
// @route   POST /api/posts/:id/like
// @access  Private
const likePost = async (req, res) => {
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
    }

    post.likes = likes;
    await post.save();
    res.json(post.likes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Comment on a post
// @route   POST /api/posts/:id/comment
// @access  Private
const commentPost = async (req, res) => {
  const { text } = req.body;

  try {
    const post = await Post.findByPk(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = await Comment.create({
      _id: uuidv4(),
      postId: req.params.id,
      userId: req.user._id,
      text
    });
    
    const fullComment = await Comment.findByPk(comment._id, {
      include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'university', 'role'] }]
    });

    const commentObj = fullComment.toJSON();
    commentObj.userId = commentObj.user;

    res.status(201).json(commentObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get comments for a post
// @route   GET /api/posts/:id/comments
// @access  Public
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

// @desc    Get post by ID
// @route   GET /api/posts/:id
// @access  Public
const getPostById = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id, {
      include: [{ model: User, as: 'user', attributes: ['_id', 'name', 'university', 'role'] }]
    });

    if (post) {
      const postObj = post.toJSON();
      postObj.userId = postObj.user;
      console.log("console from backend", postObj);
      res.json(postObj);
    } else {
      res.status(404).json({ message: 'Post not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update own post (Student only)
// @route   PUT /api/posts/:id
// @access  Private (owner only)
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

    let imageUrl = post.imageUrl;
    let imageId = post.imageId;

    if (req.file) {
      // Delete old image from Cloudinary if it exists
      if (post.imageId) {
        const { deleteImage } = require('../utils/cloudinary');
        await deleteImage(post.imageId);
      }
      const { uploadImage } = require('../utils/cloudinary');
      const result = await uploadImage(req.file.path);
      imageUrl = result.secure_url;
      imageId = result.public_id;
    }

    post.title = title !== undefined ? (title || null) : post.title;
    post.content = content ?? post.content;
    post.imageUrl = imageUrl;
    post.imageId = imageId;
    await post.save();

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete own post (Student only)
// @route   DELETE /api/posts/:id
// @access  Private (owner only)
const deleteOwnPost = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.userId !== req.user._id) {
      return res.status(403).json({ message: 'Not authorised to delete this post' });
    }

    // Delete image from Cloudinary if exists
    if (post.imageId) {
      const { deleteImage } = require('../utils/cloudinary');
      await deleteImage(post.imageId);
    }

    // Delete associated comments then the post
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

