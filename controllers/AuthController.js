const express = require('express');
const pino = require('pino');
const dest = pino.destination({sync: false});
const logger = pino(dest);
const asyncMiddleware = require('../utils/asyncMiddleware');
const {createTokensByEmailAndPassword} = require("../services/AuthService");
const {createUserAndTokensByEmailAndPassword} = require("../services/AuthService");
const {addPassword} = require("../services/AuthService");
const {updateTokens} = require("../services/AuthService");
const {createTokensViaCredentials} = require("../services/AuthService");

const router = express.Router();


router.post("/signup", asyncMiddleware(async (req, res) => {
    const json = await createUserAndTokensByEmailAndPassword(req.body.user, req.headers['fingerprint'], req.get('User-Agent'));
    res.status(json.status).send(json.body);
}));

router.post("/signin", asyncMiddleware(async (req, res) => {
    const json = await createTokensByEmailAndPassword(req.body.user, req.headers['fingerprint'], req.get('User-Agent'));
    res.status(json.status).send(json.body);
}))


router.post("/refresh", asyncMiddleware(async (req, res) => {
    const json = await updateTokens(req.body.refreshToken, req.headers['fingerprint'], req.get('User-Agent'));
    res.status(json.status).send(json.body);
}));

module.exports = router;
