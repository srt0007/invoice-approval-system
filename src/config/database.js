const { Sequelize } = require('sequelize');
const config = require('./index');
const logger = require('../utils/logger');

// Use DATABASE_URL if available (Railway/production) otherwise use individual config
const sequelize = config.database.url
  ? new Sequelize(config.database.url, {
      dialect: 'postgres',
      logging: (msg) => logger.debug(msg),
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        timestamps: true,
        underscored: false,
      },
      dialectOptions: {
        ssl: config.nodeEnv === 'production' ? {
          require: true,
          rejectUnauthorized: false,
        } : false,
      },
    })
  : new Sequelize(
      config.database.name,
      config.database.user,
      config.database.password,
      {
        host: config.database.host,
        port: config.database.port,
        dialect: 'postgres',
        logging: (msg) => logger.debug(msg),
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
        define: {
          timestamps: true,
          underscored: false,
        },
      }
    );

module.exports = sequelize;
