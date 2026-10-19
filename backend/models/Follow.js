const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Follow = sequelize.define('Follow', {
  _id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
  },
  followerId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'The user who is following',
  },
  followingId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'The user being followed',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName: 'follows',
  indexes: [
    {
      unique: true,
      fields: ['followerId', 'followingId'],
      name: 'unique_follow_pair',
    },
  ],
});

module.exports = Follow;
