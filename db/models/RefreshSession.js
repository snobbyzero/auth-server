const {sequelize} = require('../index');
const DataTypes = require('sequelize');

const RefreshSession = sequelize.define('RefreshSession',
    {
        refreshToken: {
            type: DataTypes.UUIDV4,
            field: 'refresh_token'
        },
        userAgent: {
            type: DataTypes.STRING(200),
            field: 'user_agent'
        },
        fingerprint: {
            type: DataTypes.STRING(200),
            field: 'fingerprint'
        },
        expiresIn: {
            type: DataTypes.BIGINT,
            field: 'expires_in'
        },
    },
    {
        timestamps: true,
        updatedAt: false,
        underscored: true,
        freezeTableName: true,
        tableName: 'refresh_sessions'
    });


module.exports.RefreshSession = RefreshSession;
