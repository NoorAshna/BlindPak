'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: true,
        references: { model: 'users', key: '_id' },
        onDelete: 'SET NULL',
      },
      resource: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      action: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('SUCCESS', 'FAILURE'),
        allowNull: false,
        defaultValue: 'SUCCESS',
      },
      targetId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      ip: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      platform: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      device: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      browser: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      os: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('audit_logs', ['userId']);
    await queryInterface.addIndex('audit_logs', ['resource', 'action']);
    await queryInterface.addIndex('audit_logs', ['createdAt']);
    await queryInterface.addIndex('audit_logs', ['ip']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_audit_logs_status";');
  },
};
