require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const pino = require('pino');
const dest = pino.destination({sync: false});
const logger = pino(dest);
const {sequelize} = require('./db/index');
const asyncMiddleware = require('./utils/asyncMiddleware');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// Load tables
sequelize.sync().then(result => {
    logger.info('sync successfully');
    // Start server
    listen();
}).catch(err => {
    logger.info(err);
});

const app = express();
const secretCookieKey = process.env.cookieSecretKey;

app.use(bodyParser.urlencoded({extended: false}));

app.use(bodyParser.json());

app.use(cors({
    origin: "http://localhost:3003", // allow to server to accept request from different origin
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true
}));

app.use(cookieParser(secretCookieKey));

app.use('/auth/google', require('./controllers/GoogleAuthController'));
app.use('/auth/base', require('./controllers/AuthController'));

app.set('port', process.env.PORT || 3000);

app.get('/logout', asyncMiddleware(async (req, res) => {
    req.logout();
    res.redirect('/');
}));

const listen = () => {
    app.listen(app.get('port'), () => {
        logger.info(`App is listening at http://localhost:${app.get('port')}`);
    });
};

// TODO https + add secure to cookies
