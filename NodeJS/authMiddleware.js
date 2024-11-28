// authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        console.error("No authorization header found in authenticate.");
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
        console.log("Authentication successful. Token decoded:", decoded);
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Authentication failed:", error.message);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = authenticate;
