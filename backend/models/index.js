const User = require('./User');
const Post = require('./Post');
const Comment = require('./Comment');
const Otp = require('./Otp');
const Follow = require('./Follow');
const Notification = require('./Notification');

// ── Post associations ─────────────────────────────────────────────────────────
User.hasMany(Post, { foreignKey: 'userId', onDelete: 'CASCADE' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ── Comment associations ──────────────────────────────────────────────────────
Post.hasMany(Comment, { foreignKey: 'postId', onDelete: 'CASCADE', as: 'comments' });
Comment.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
User.hasMany(Comment, { foreignKey: 'userId', onDelete: 'CASCADE' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ── Follow associations ───────────────────────────────────────────────────────
User.hasMany(Follow, { foreignKey: 'followerId', as: 'following', onDelete: 'CASCADE' });
User.hasMany(Follow, { foreignKey: 'followingId', as: 'followers', onDelete: 'CASCADE' });
Follow.belongsTo(User, { foreignKey: 'followerId', as: 'follower' });
Follow.belongsTo(User, { foreignKey: 'followingId', as: 'followed' });

// ── Notification associations ─────────────────────────────────────────────────
User.hasMany(Notification, { foreignKey: 'recipientId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });
Notification.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });

module.exports = {
  User,
  Post,
  Comment,
  Otp,
  Follow,
  Notification,
};
