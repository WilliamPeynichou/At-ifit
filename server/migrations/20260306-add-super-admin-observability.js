'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const hasTable = async (tableName) => {
      const tables = await queryInterface.showAllTables();
      return tables.map(String).includes(tableName);
    };

    const addColumnIfMissing = async (tableName, columnName, definition) => {
      const table = await queryInterface.describeTable(tableName);
      if (!table[columnName]) {
        await queryInterface.addColumn(tableName, columnName, definition);
      }
    };

    await addColumnIfMissing('Users', 'role', {
      type: Sequelize.ENUM('user', 'admin', 'super_admin'),
      allowNull: false,
      defaultValue: 'user',
    });

    await queryInterface.sequelize.query(
      "UPDATE `Users` SET `role` = 'super_admin' WHERE LOWER(`pseudo`) = 'wili' OR LOWER(SUBSTRING_INDEX(`email`, '@', 1)) = 'wili'"
    );

    if (!(await hasTable('AuditLogs'))) {
      await queryInterface.createTable('AuditLogs', {
        id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
        userId: { type: Sequelize.INTEGER, allowNull: true },
        actorUserId: { type: Sequelize.INTEGER, allowNull: true },
        eventType: { type: Sequelize.STRING(100), allowNull: false },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'success' },
        riskLevel: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'low' },
        category: { type: Sequelize.STRING(60), allowNull: true },
        message: { type: Sequelize.STRING(500), allowNull: true },
        ip: { type: Sequelize.STRING(64), allowNull: true },
        userAgent: { type: Sequelize.STRING(500), allowNull: true },
        metadata: { type: Sequelize.JSON, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('AuditLogs', ['userId', 'createdAt']);
      await queryInterface.addIndex('AuditLogs', ['actorUserId', 'createdAt']);
      await queryInterface.addIndex('AuditLogs', ['eventType', 'createdAt']);
      await queryInterface.addIndex('AuditLogs', ['status', 'createdAt']);
    }

    if (!(await hasTable('StravaApiLogs'))) {
      await queryInterface.createTable('StravaApiLogs', {
        id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
        userId: { type: Sequelize.INTEGER, allowNull: true },
        callType: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'other' },
        endpoint: { type: Sequelize.STRING(255), allowNull: false },
        method: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'GET' },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'success' },
        httpStatus: { type: Sequelize.INTEGER, allowNull: true },
        durationMs: { type: Sequelize.INTEGER, allowNull: true },
        attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        errorMessage: { type: Sequelize.STRING(500), allowNull: true },
        itemCount: { type: Sequelize.INTEGER, allowNull: true },
        resourceId: { type: Sequelize.STRING(100), allowNull: true },
        metadata: { type: Sequelize.JSON, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('StravaApiLogs', ['userId', 'createdAt']);
      await queryInterface.addIndex('StravaApiLogs', ['callType', 'createdAt']);
      await queryInterface.addIndex('StravaApiLogs', ['status', 'createdAt']);
    }

    if (!(await hasTable('AiUsageLogs'))) {
      await queryInterface.createTable('AiUsageLogs', {
        id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
        userId: { type: Sequelize.INTEGER, allowNull: true },
        provider: { type: Sequelize.STRING(60), allowNull: false },
        model: { type: Sequelize.STRING(120), allowNull: true },
        usageType: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'message_agent' },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'success' },
        durationMs: { type: Sequelize.INTEGER, allowNull: true },
        userMessageLength: { type: Sequelize.INTEGER, allowNull: true },
        responseLength: { type: Sequelize.INTEGER, allowNull: true },
        dataUsed: { type: Sequelize.JSON, allowNull: true },
        intents: { type: Sequelize.JSON, allowNull: true },
        actionProposed: { type: Sequelize.STRING(120), allowNull: true },
        actionStatus: { type: Sequelize.STRING(40), allowNull: true },
        promptTokens: { type: Sequelize.INTEGER, allowNull: true },
        completionTokens: { type: Sequelize.INTEGER, allowNull: true },
        estimatedTokens: { type: Sequelize.INTEGER, allowNull: true },
        estimatedCost: { type: Sequelize.FLOAT, allowNull: true },
        errorMessage: { type: Sequelize.STRING(500), allowNull: true },
        metadata: { type: Sequelize.JSON, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('AiUsageLogs', ['userId', 'createdAt']);
      await queryInterface.addIndex('AiUsageLogs', ['provider', 'createdAt']);
      await queryInterface.addIndex('AiUsageLogs', ['usageType', 'createdAt']);
      await queryInterface.addIndex('AiUsageLogs', ['status', 'createdAt']);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('AiUsageLogs');
    await queryInterface.dropTable('StravaApiLogs');
    await queryInterface.dropTable('AuditLogs');
    await queryInterface.removeColumn('Users', 'role');
  },
};
