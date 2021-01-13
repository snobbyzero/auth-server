const jwt = require("jsonwebtoken");
const {findOne} = require("../utils/dbFunctions");
const {User} = require("../db/models/User");
const {RefreshSession} = require("../db/models/RefreshSession");
const {create} = require("../utils/dbFunctions");
const {v4: uuidv4} = require('uuid');
const {destroy} = require("../utils/dbFunctions");

const secretKey = process.env.jwtSecretKey;

const createAccessToken = async (user) => {
    const token = await jwt.sign({id: user.id, email: user.email}, secretKey, {
        algorithm: 'HS256',
        expiresIn: '30m'
    });
    return `Bearer ${token}`;
}

const createRefreshSession = async (userId, fingerprint, userAgent) => {
    const expiresIn = new Date();
    expiresIn.setMonth(expiresIn.getMonth() + 2);
    const refreshToken = await uuidv4();
    const res = await create(RefreshSession, {
            userId: userId,
            fingerprint: fingerprint,
            userAgent: userAgent,
            expiresIn: expiresIn.getTime(),
            refreshToken: refreshToken
        }
    );
    if (res.error) {
        return res;
    }
    return refreshToken;
};

const findOrCreateUser = async (user) => {
    const savedUser = await findOne(User, {id: user.id})
    if (savedUser) {
        return savedUser;
    }
    return await create(User, {
        id: user.id,
        email: user.email
    });
};

module.exports.createTokens = async (user, fingerprint, userAgent) => {
    const [savedUser, accessToken, refreshToken] = await Promise.all(
        [
            findOrCreateUser(user),
            createAccessToken(user),
            createRefreshSession(user.id, fingerprint, userAgent)
        ]
    );
    if (savedUser.error) {
        return savedUser;
    }
    if (refreshToken.error) {
        return refreshToken;
    }
    return {
        accessToken: accessToken,
        refreshToken: refreshToken
    };
};

module.exports.updateTokens = async (accessToken, refreshToken, fingerprint, userAgent) => {
    if (refreshToken) {
        const refreshSession = await findOne(RefreshSession, {refreshToken: refreshToken});
        if (refreshSession) {
            destroy(refreshSession);
            if (refreshSession.fingerprint !== fingerprint) {
                return {error: 'INVALID_REFRESH_SESSION'};
            }
            if (refreshSession.expiresIn < new Date().getTime()) {
                return {error: 'TOKEN_EXPIRED'};
            }
            const user = await getUserCredentialsFromToken(accessToken);
            if (user.err) {
                return {status: 403, error: user.err}
            }
            const [newAccessToken, newRefreshToken] = await Promise.all(
                [
                    createAccessToken(user),
                    createRefreshSession(user, fingerprint, userAgent)
                ]
            );

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            };
        }
    }
    return {status: 403, error: 'INVALID_REFRESH_TOKEN'};
};

const getUserCredentialsFromToken = async (accessToken) => {
    const token = accessToken.split(' ')[1];
    try {
        return jwt.verify(token, secretKey);
    } catch (err) {
        return {error: err};
    }
};