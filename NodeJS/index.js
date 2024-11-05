const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const adminMiddleware = require('./adminMiddleware.js');
const authenticate = require('./authMiddleware.js');
const cors = require('cors'); 
require('dotenv').config();

const app = express();
app.use(express.json());

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests from both 'http://localhost' and 'http://127.0.0.1:5500'
        if (origin === 'http://localhost' || origin === 'http://127.0.0.1:5500' || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.post("/create_account", async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.query(
            'INSERT INTO Users (username, password_hash) VALUES (?, ?)',
            [username, hashedPassword],
            (err, results) => {
                if (err) {
                    console.error('Database error:', err); // Log the exact database error
                    return res.status(500).json({ error: 'Database error' });
                }
                res.status(201).json({ message: 'User created successfully' });
            }
        );
    } catch (error) {
        console.error('Error creating account:', error); // Catch any unexpected errors
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM Users WHERE username = ?', [username], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { userId: user.user_id, username: user.username, is_admin: user.is_admin },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ message: 'Login successful', token });
    });
});


//admin route / authentication
app.get('/admin', authenticate, adminMiddleware, (req, res) => {
    res.json({ message: 'Welcome to the admin page', user: req.user });
});


// Protected route
app.get('/protected', authenticate, (req, res) => {
    res.json({ message: 'This is a protected route', user: req.user });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
