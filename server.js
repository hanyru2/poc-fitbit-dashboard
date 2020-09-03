var http = require('http');
var path = require('path');

// initialize the express application
var express = require("express");
var session = require("express-session");
var process = require("process");
var router = express();

var env = require("./config/app")

router.use(express.static(path.resolve(__dirname, 'client')));

// initialize the Fitbit API client
var FitbitApiClient = require("fitbit-node");
var client = new FitbitApiClient(env.CLIENT_ID, env.CLIENT_SECRET);

// Use the session middleware
router.use(session({ secret: env.SESSION_SECRET, cookie: { maxAge: 60000 }, resave: false, saveUninitialized: true }));

// redirect the user to the Fitbit authorization page
router.get("/authorize", function(req, res) {
    // request access to the user's activity, heartrate, location, nutrion, profile, settings, sleep, social, and weight scopes
    res.redirect(client.getAuthorizeUrl('activity heartrate location nutrition profile settings sleep social weight', env.CALLBACK_URL));
});

// handle the callback from the Fitbit authorization flow
router.get("/callback", function(req, res) {
    // exchange the authorization code we just received for an access token
    client.getAccessToken(req.query.code, env.CALLBACK_URL).then(function(result) {
        // use the access token to fetch the user's profile information
        req.session.authorized = true;
        req.session.access_token = result.access_token;
        req.session.save();
        res.redirect("/");
    }).catch(function(error) {
        res.send(error);
    });
});

router.get("/logout", function(req, res) {
    req.session.authorized = false;
    req.session.access_token = null;
    req.session.save();
    res.redirect("/");
})

router.get('/profile', function(req, res) {
    if (req.session.authorized) {
        client.get("/profile.json", req.session.access_token).then(function(results) {
            res.json(results[0]);
        });
    } else {
        res.status(403);
        res.json({ errors: [{ message: 'not authorized' }] });
    }
});

router.get('/devices', function(req, res) {
    if (req.session.authorized) {
        client.get("/devices.json", req.session.access_token).then(function(results) {
            res.json(results[0]);
        });
    } else {
        res.status(403);
        res.json({ errors: [{ message: 'not authorized' }] });
    }
});

router.get('/activities/:date', function(req, res) {
    if (req.session.authorized) {
        // var nowdate = new Date()
        // var nowdateNewFormat = nowdate.getFullYear() + "-" + ("0" + (nowdate.getMonth() + 1)).slice(-2) + "-" + ("0" + nowdate.getDate()).slice(-2);
        // var prevdate = new Date()
        // prevdate = new Date(prevdate.setDate(prevdate.getDate() - 10))
        // var prevdateNewFormat = prevdate.getFullYear() + "-" + ("0" + (prevdate.getMonth() + 1)).slice(-2) + "-" + ("0" + prevdate.getDate()).slice(-2);
        // var params = "beforeDate=" + nowdateNewFormat + "&sort=asc&offset=0&limit=10";
        client.get("/activities/date/" + req.params.date + ".json", req.session.access_token).then(function(results) {
            res.json(results[0]);
        });
    } else {
        res.status(403);
        res.json({ errors: [{ message: 'not authorized' }] });
    }
});

router.get('/heartrate/:date', function(req, res) {
    if (req.session.authorized) {
        client.get("/activities/heart/date/" + req.params.date + "/1d.json", req.session.access_token).then(function(results) {
            res.json(results[0]);
        });
    } else {
        res.status(403);
        res.json({ errors: [{ message: 'not authorized' }] });
    }
});

// launch the server
router.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
    console.log('server listening');
});