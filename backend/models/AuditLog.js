const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  // Who performed the action (null for unauthenticated)
  userId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'FK to users._id — null for unauthenticated actions',
  },
  // Category of resource being acted upon
  resource: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: 'e.g. AUTH, POST, COMMENT, USER, ADMIN',
  },
  // Specific action
  action: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: 'e.g. REGISTER, LOGIN, LOGIN_FAILED, LOGOUT, CREATE_POST, DELETE_POST, FOLLOW, UNFOLLOW, UPDATE_PROFILE, PASSWORD_RESET_REQUEST, PASSWORD_RESET, ADMIN_DELETE_POST, ADMIN_BAN_USER',
  },
  // HTTP outcome
  status: {
    type: DataTypes.ENUM('SUCCESS', 'FAILURE'),
    allowNull: false,
    defaultValue: 'SUCCESS',
  },
  // Optional target entity
  targetId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID of the affected resource (post._id, comment._id, target user._id, etc.)',
  },
  // Contextual metadata (JSON)
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Extra context: error message, old/new values, etc.',
  },
  // Device info captured at time of action
  ip: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  platform: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  device: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  browser: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  os: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName: 'audit_logs',
  indexes: [
    { fields: ['userId'] },
    { fields: ['resource', 'action'] },
    { fields: ['createdAt'] },
    { fields: ['ip'] },
  ],
});

module.exports = AuditLog;
