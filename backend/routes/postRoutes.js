const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createPost,
  getPosts,
  likePost,
  commentPost,
  getComments,
  getPostById,
  updatePost,
  deleteOwnPost
} = require('../controllers/postController');


router.route('/')
  .get(getPosts)
  .post(protect, createPost);

router.route('/:id')
  .get(getPostById)
  .put(protect, updatePost)
  .delete(protect, deleteOwnPost);
router.route('/:id/like').post(protect, likePost);
router.route('/:id/comment').post(protect, commentPost);
router.route('/:id/comments').get(getComments);

module.exports = router;
