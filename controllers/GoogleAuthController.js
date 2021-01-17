const express = require('express');
const pino = require('pino');
const dest = pino.destination({ sync: false });
const logger = pino(dest);
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const asyncMiddleware = require('../utils/asyncMiddleware');
const {updateTokens} = require("../services/AuthService");
const {createTokens} = require("../services/AuthService");
const {User} = require("../db/models/User");
const {findOne, create} = require("../utils/dbFunctions");

const router = express.Router();

router.get("/", passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"]
}));

router.get("/redirect", passport.authenticate("google", {session: false}), asyncMiddleware(async (req, res) => {
    const tokens = await createTokens(req.user, req.headers['fingerprint'], req.get('User-Agent'));
    res.cookie('refreshToken', tokens.refreshToken, {httpOnly: true, maxAge: 2 * 30 * 24 * 60 * 60 * 1000, signed: true});
    res.status(200).send(tokens);
}));

router.get("/refresh", asyncMiddleware(async (req, res) => {
    console.log(req.signedCookies);
    const tokens = await updateTokens(req.headers.authorization, req.signedCookies.refreshToken, req.headers['fingerprint'], req.get('User-Agent'));
    res.cookie('refreshToken', tokens.refreshToken, {httpOnly: true, maxAge: 2 * 30 * 24 * 60 * 60 * 1000, signed: true});
    res.status(200).send(tokens);
}));

passport.use(new GoogleStrategy(
    {
        clientID: process.env.googleClientID,
        clientSecret: process.env.googleClientSecret,
        callbackURL: '/auth/google/redirect'
    }, async (accessToken, refreshToken, profile, cb) => {
        const user = await findOne(User, {googleId: profile.id});
        if (user) {
            cb(null, user);
        } else {
            const u = await create(User, {googleId: profile.id, email: profile.emails[0].value});
            cb(null, u);
        }
    })
);

module.exports = router;
