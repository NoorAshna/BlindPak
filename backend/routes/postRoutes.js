const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const {
  createPost,
  getPosts,
  likePost,
  commentPost,
  getComments,
  getPostById
} = require('../controllers/postController');

const upload = multer({ dest: 'uploads/' });

router.route('/')
  .get(getPosts)
  .post(protect, upload.single('image'), createPost);

router.route('/:id').get(getPostById);
router.route('/:id/like').post(protect, likePost);
router.route('/:id/comment').post(protect, commentPost);
router.route('/:id/comments').get(getComments);

module.exports = router;
