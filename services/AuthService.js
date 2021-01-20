const jwt = require("jsonwebtoken");
const {hash, verify} = require("../utils/securePassword");
const {update} = require("../utils/dbFunctions");
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
            user_id: userId,
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
    console.log(user);
    let savedUser;
    // If user try to sign in/up via Google OAuth2
    if (user.googleId) {
        savedUser = await findOne(User, {google_id: user.googleId});
    } else {
        savedUser = await findOne(User, {email: user.email});
        if (savedUser && !(await verify(user.password, savedUser.password))) {
            return null;
        }
    }
    if (savedUser) {
        return savedUser;
    }
    return await create(User, {
        google_id: user.googleId,
        email: user.email,
        password: await hash(user.password)
    });
};

module.exports.addPassword = async (user) => {
    const savedUser = await findOne(User, {
        id: user.id,
        google_id: user.googleId,
        email: user.email,
        password: null
    });
    if (savedUser) {
        const u = await update(User, {password: await hash(user.password)}, [], {
            id: user.id,
            google_id: user.googleId,
            email: user.email
        });
        if (u.error) {
            return {
                status: 400,
                body: u
            };
        } else {
            return {
                status: 200,
                body: 'OK'
            };
        }
    } else {
        return {
            status: 404,
            body: 'NOT_FOUND'
        }
    }
};

module.exports.createTokensViaCredentials = async (user, fingerprint, userAgent) => {
    const savedUser = await findOrCreateUser(user);

    if (savedUser) {
        const refreshSession = await findOne(RefreshSession, {user_id: savedUser.id, fingerprint: fingerprint});
        if (refreshSession) {
            // There is no need to wait for result
            destroy(refreshSession);
        }

        if (savedUser.error) {
            return {
                status: 400,
                body: savedUser.error
            };
        }
        const [accessToken, refreshToken] = await Promise.all(
            [
                createAccessToken(savedUser),
                createRefreshSession(savedUser.id, fingerprint, userAgent)
            ]
        );
        if (refreshToken.error) {
            return {
                status: 400,
                body: refreshToken.error
            };
        }
        return {
            status: 200,
            body: {
                accessToken: accessToken,
                refreshToken: refreshToken
            }
        };
    }
    return {
        status: 401,
        body: 'UNAUTHORIZED'
    }
};

module.exports.updateTokens = async (accessToken, refreshToken, fingerprint, userAgent) => {
    if (refreshToken) {
        const refreshSession = await findOne(RefreshSession, {refreshToken: refreshToken});
        if (refreshSession) {
            await destroy(refreshSession);
            if (refreshSession.fingerprint !== fingerprint) {
                return {
                    status: 400,
                    body: 'INVALID_REFRESH_SESSION'
                };
            }
            if (refreshSession.expiresIn < new Date().getTime()) {
                return {
                    status: 400,
                    body: 'TOKEN_EXPIRED'
                };
            }
            const user = await getUserCredentialsFromToken(accessToken);
            if (user.err) {
                return {status: 403, body: user.err}
            }
            const [newAccessToken, newRefreshToken] = await Promise.all(
                [
                    createAccessToken(user),
                    createRefreshSession(user.id, fingerprint, userAgent)
                ]
            );

            return {
                status: 200,
                body: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken
                }
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
