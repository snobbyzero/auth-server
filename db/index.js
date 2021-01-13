const Sequelize = require('sequelize/lib/sequelize');
const fs = require('fs');
const path = require("path");

const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOSTNAME = process.env.DB_HOSTNAME;
const DB_NAME = process.env.DB_NAME;
const DB_DIALECT = process.env.DB_DIALECT;

module.exports.sequelize = new Sequelize(DB_NAME, DB_USERNAME, DB_PASSWORD, {
    host: DB_HOSTNAME,
    dialect: DB_DIALECT,
    logging: false
});

const models = {};

fs.readdirSync(path.join(__dirname, 'models')).forEach(file => {
    const model = require(path.join(__dirname, 'models', file));

    models[model.name] = model;
});
Object.keys(models).forEach(modelName => {
    if ("associate" in models[modelName]) {
        models[modelName].associate(models);
    }
});

models.Sequelize = Sequelize;
module.exports.models = models;
