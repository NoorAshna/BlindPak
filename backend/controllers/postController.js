const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { uploadImage } = require('../utils/cloudinary');
const { v4: uuidv4 } = require('uuid');

// @desc    Create a post
// @route   POST /api/posts
// @access  Private (Student only)
const createPost = async (req, res) => {
  if (!req.user.canPost) {
    return res.status(403).json({ message: 'Only students can post' });
  }

  const { content } = req.body;
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
      content,
      imageUrl,
      imageId
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
    const posts = await Post.aggregate([
      {
        $lookup: {
          from: 'comments',
          localField: '_id',
          foreignField: 'postId',
          as: 'comments'
        }
      },
      {
        $addFields: {
          commentCount: { $size: '$comments' }
        }
      },
      {
        $project: {
          comments: 0
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Like a post
// @route   POST /api/posts/:id/like
// @access  Private
const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.likes.includes(req.user._id)) {
      post.likes = post.likes.filter((id) => id !== req.user._id);
    } else {
      post.likes.push(req.user._id);
    }

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
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = await Comment.create({
      _id: uuidv4(),
      postId: req.params.id,
      userId: req.user._id,
      text
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get comments for a post
// @route   GET /api/posts/:id/comments
// @access  Public
const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.id }).sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get post by ID
// @route   GET /api/posts/:id
// @access  Public
const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post) {
      res.json(post);
    } else {
      res.status(404).json({ message: 'Post not found' });
    }
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
  getPostById
};
