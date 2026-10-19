const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  _id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  hashedEmail: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'public',
    validate: {
      isIn: [['admin', 'student', 'public']],
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  university: {
    type: DataTypes.STRING,
    defaultValue: 'General',
  },
  // Short bio shown on profile page (max 300 chars)
  bio: {
    type: DataTypes.STRING(300),
    allowNull: true,
    defaultValue: null,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName: 'users',
});

module.exports = User;
