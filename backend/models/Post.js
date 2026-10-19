const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Post = sequelize.define('Post', {
  _id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  likes: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName: 'posts',
});

module.exports = Post;
