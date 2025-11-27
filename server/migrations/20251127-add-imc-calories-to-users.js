'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'imc', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'Indice de Masse Corporelle (IMC)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'imc');
  }
};

