const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Notification = sequelize.define('Notification', {
  _id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
  },
  // The user who RECEIVES this notification
  recipientId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // The user who triggered this notification (actor)
  actorId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Type: 'follow' | 'comment' | 'mention' | 'like'
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Optional reference to the post/comment
  postId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  commentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Human-readable message
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName: 'notifications',
});

module.exports = Notification;
