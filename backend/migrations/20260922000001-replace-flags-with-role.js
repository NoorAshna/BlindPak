'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('users');
    if (!tableInfo.role) {
      await queryInterface.addColumn('users', 'role', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'public'
      });
    }
    if (tableInfo.isAdmin) {
      await queryInterface.sequelize.query('UPDATE "users" SET "role" = \'admin\' WHERE "isAdmin" = true;');
    }
    if (tableInfo.isStudent) {
      await queryInterface.sequelize.query('UPDATE "users" SET "role" = \'student\' WHERE "isStudent" = true AND "role" != \'admin\';');
    }
    if (tableInfo.isAdmin) {
      await queryInterface.removeColumn('users', 'isAdmin');
    }
    if (tableInfo.isStudent) {
      await queryInterface.removeColumn('users', 'isStudent');
    }
    if (tableInfo.canPost) {
      await queryInterface.removeColumn('users', 'canPost');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'isStudent', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn('users', 'canPost', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn('users', 'isAdmin', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.removeColumn('users', 'role');
  }
};
