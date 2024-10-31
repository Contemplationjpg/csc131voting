const jwt = require('jsonwebtoken');
require('dotenv').config();

const adminMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        console.error("Authorization header is missing.");
        return res.status(401).json({ error: 'Access denied' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        console.log("Decoded token:", decoded); // Log the entire decoded token
        console.log("Decoded is_admin:", decoded.is_admin); // Log the value of `is_admin`

        // Check if the user is an admin
        if (decoded.is_admin !== true && decoded.is_admin !== 1) {
            console.error("User is not an admin:", decoded);
            return res.status(403).json({ error: 'Admin access required' });
        }

        req.user = decoded; // Store the decoded token for further use
        next(); // Allow access to the admin route
    } catch (error) {
        console.error("Token verification failed:", error.message); // Log any verification errors
        return res.status(403).json({ error: 'Invalid token' });
    }
};

module.exports = adminMiddleware;
