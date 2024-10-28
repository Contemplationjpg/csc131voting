const express = require('express');
const app = express();

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}

app.use(express.json()); // for parsing application/json

app.use(allowCrossDomain);

app.post("/msg", (req, res, next) => {
 const message = req.body.message;
 res.json({
    "username": req.body.username,
    "password": req.body.password,
 })
});

app.listen(3000, () => {
 console.log("Server running on port 3000");
});