const {sequelize} = require('../index');
const DataTypes = require('sequelize');

const User = sequelize.define('User',
    {
        id: {
            type: DataTypes.DECIMAL,
            primaryKey: true,
            field: 'google_id'
        },
        email: {
            type: DataTypes.STRING,
            field: 'email'
        }
    },
    {
        timestamps: true,
        updatedAt: false,
        underscored: true,
        freezeTableName: true,
        tableName: 'users'
    });


module.exports.User = User;
