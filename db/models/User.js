const {sequelize} = require('../index');
const DataTypes = require('sequelize');
const {RefreshSession} = require("./RefreshSession");

const User = sequelize.define('User',
    {
        email: {
            type: DataTypes.STRING,
            field: 'email'
        },
        password: {
            type: DataTypes.STRING,
            field: 'password'
        },
        googleId: {
            type: DataTypes.STRING(21),
            field: 'google_id'
        }
    },
    {
        timestamps: true,
        updatedAt: false,
        underscored: true,
        freezeTableName: true,
        tableName: 'users'
    });

User.hasMany(RefreshSession, {
    foreignKey: 'user_id'
});
RefreshSession.belongsTo(User, {
    foreignKey: 'user_id'
})

module.exports.User = User;
