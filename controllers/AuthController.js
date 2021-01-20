const express = require('express');
const pino = require('pino');
const dest = pino.destination({ sync: false });
const logger = pino(dest);
const asyncMiddleware = require('../utils/asyncMiddleware');
const {addPassword} = require("../services/AuthService");
const {updateTokens} = require("../services/AuthService");
const {createTokensViaCredentials} = require("../services/AuthService");

const router = express.Router();


router.post("/", asyncMiddleware(async (req, res) => {
    const json = await createTokensViaCredentials(req.body, req.headers['fingerprint'], req.get('User-Agent'));
    if (json.status === 200) {
        res.cookie('refreshToken', json.body.refreshToken, {
            httpOnly: true,
            maxAge: 2 * 30 * 24 * 60 * 60 * 1000,
            signed: true
        });
    }
    res.status(json.status).send(json.body);
}));


router.get("/refresh", asyncMiddleware(async (req, res) => {
    console.log(req.signedCookies);
    const json = await updateTokens(req.headers.authorization, req.signedCookies.refreshToken, req.headers['fingerprint'], req.get('User-Agent'));
    if (json.status === 200) {
        res.cookie('refreshToken', json.body.refreshToken, {
            httpOnly: true,
            maxAge: 2 * 30 * 24 * 60 * 60 * 1000,
            signed: true
        });
    }
    res.status(json.status).send(json.body);
}));


router.patch("/password", asyncMiddleware(async (req, res) => {
    const user = req.body;
    const json = await addPassword(user);
    res.status(json.status).send(json.body);
}));


module.exports = router;
