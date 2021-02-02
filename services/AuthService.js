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

module.exports.createTokensByGoogleId = async (user, fingerprint, userAgent) => {
    const savedUser = await getOrCreateUserByGoogleId(user);
    if (savedUser.error) {
        return {
            status: 400,
            body: savedUser.error
        }
    }
    return await createTokensViaCredentials(savedUser, fingerprint, userAgent)
}

module.exports.createTokensByEmailAndPassword = async (user, fingerprint, userAgent) => {
    const savedUser = await getUserByEmailAndPassword(user);
    if (savedUser.error) {
        return {
            status: 400,
            body: savedUser.error
        }
    }
    return await createTokensViaCredentials(savedUser, fingerprint, userAgent);
}


module.exports.createUserAndTokensByEmailAndPassword = async (user, fingerprint, userAgent) => {
    let savedUser = await findOne(User, {email: user.email});
    if (savedUser) {
        return {
            status: 400,
            body: 'ALREADY_EXISTS'
        }
    }
    savedUser = await createUserByEmailAndPassword(user);
    return await createTokensViaCredentials(savedUser, fingerprint, userAgent)
}

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

const createUserByEmailAndPassword = async (user) => {
    return await create(User, {
        email: user.email,
        password: await hash(user.password)
    });
}

const getOrCreateUserByGoogleId = async (user) => {
    const savedUser = await findOne(User, {google_id: user.googleId});
    if (savedUser) {
        return savedUser;
    }
    return await create(User, {
        email: user.email,
        google_id: user.googleId
    });
}

const getUserByEmailAndPassword = async (user) => {
    const savedUser = await findOne(User, {email: user.email});
    if (savedUser) {
        if (await verify(user.password, savedUser.password)) {
            return savedUser;
        }
        return {error: 'INCORRECT_PASSWORD'}
    }
    return {error: 'NOT_FOUND'};
}

const createTokensViaCredentials = async (savedUser, fingerprint, userAgent) => {

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

module.exports.updateTokens = async (refreshToken, fingerprint, userAgent) => {
    console.log(`Refresh token: ${refreshToken}`);
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
            const user = await findOne(User, {id: refreshSession.user_id});
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
    return {status: 400, body: 'INVALID_REFRESH_TOKEN'};
};
