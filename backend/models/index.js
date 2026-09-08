const User = require('./User');
const Post = require('./Post');
const Comment = require('./Comment');
const Otp = require('./Otp');

// Associations
User.hasMany(Post, { foreignKey: 'userId', onDelete: 'CASCADE' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Post.hasMany(Comment, { foreignKey: 'postId', onDelete: 'CASCADE', as: 'comments' });
Comment.belongsTo(Post, { foreignKey: 'postId', as: 'post' });

User.hasMany(Comment, { foreignKey: 'userId', onDelete: 'CASCADE' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  User,
  Post,
  Comment,
  Otp
};
