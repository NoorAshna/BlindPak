'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('posts', 'imageUrl');
    await queryInterface.removeColumn('posts', 'imageId');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('posts', 'imageUrl', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addColumn('posts', 'imageId', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null
    });
  }
};
