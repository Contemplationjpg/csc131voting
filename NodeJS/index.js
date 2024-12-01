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
        if (origin === 'http://localhost' || origin === 'http://127.0.0.1:5500' || !origin || origin==='null') {
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
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
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

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
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


app.get('/polls', authenticate, (req, res) => {
    const query = `
        SELECT p.poll_id, p.title, p.description, p.deadline, po.option_id, po.option_text, po.votes
        FROM Polls p
        LEFT JOIN polloptions po ON p.poll_id = po.poll_id
        ORDER BY p.created_at DESC;
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error retrieving polls' });

        // Group options under their respective polls
        const polls = results.reduce((acc, row) => {
            if (!acc[row.poll_id]) {
                acc[row.poll_id] = { 
                    poll_id: row.poll_id, 
                    title: row.title, 
                    description: row.description, 
                    deadline: new Date(row.deadline).toISOString(), // Ensure ISO format
                    options: [] 
                };
            }
            acc[row.poll_id].options.push({ option_id: row.option_id, option_text: row.option_text, votes: row.votes });
            return acc;
        }, {});

        res.json(Object.values(polls));
    });
});



app.post('/polls/vote', authenticate, (req, res) => {
    const { poll_id, option_id } = req.body;
    const user_id = req.user.userId;

    // Check if the user is an admin
    if (req.user.is_admin === 1) {
        return res.status(403).json({ error: 'Admins are not allowed to vote' });
    }

    // Check if the poll is still open
    db.query('SELECT deadline FROM polls WHERE poll_id = ?', [poll_id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error checking deadline' });

        const deadline = new Date(results[0].deadline);
        const now = new Date();

        if (now > deadline) {
            return res.status(400).json({ error: 'Voting for this poll has ended' });
        }

        // Check if the user has already voted
        db.query('SELECT * FROM votes WHERE user_id = ? AND poll_id = ?', [user_id, poll_id], (err, results) => {
            if (err) return res.status(500).json({ error: 'Database error checking votes' });

            if (results.length > 0) {
                // User already voted, update the vote
                const previousOptionId = results[0].option_id;

                db.query('UPDATE votes SET option_id = ? WHERE user_id = ? AND poll_id = ?', [option_id, user_id, poll_id], (err) => {
                    if (err) return res.status(500).json({ error: 'Database error updating vote' });

                    db.query('UPDATE polloptions SET votes = votes - 1 WHERE option_id = ?', [previousOptionId], (err) => {
                        if (err) return res.status(500).json({ error: 'Database error updating previous option' });

                        db.query('UPDATE polloptions SET votes = votes + 1 WHERE option_id = ?', [option_id], (err) => {
                            if (err) return res.status(500).json({ error: 'Database error updating new option' });
                            res.json({ message: 'Your vote has been updated' });
                        });
                    });
                });
            } else {
                // User has not voted yet, insert the vote
                db.query('INSERT INTO votes (user_id, poll_id, option_id) VALUES (?, ?, ?)', [user_id, poll_id, option_id], (err) => {
                    if (err) return res.status(500).json({ error: 'Database error recording vote' });

                    db.query('UPDATE polloptions SET votes = votes + 1 WHERE option_id = ?', [option_id], (err) => {
                        if (err) return res.status(500).json({ error: 'Database error updating vote count' });
                        res.json({ message: 'Your vote has been recorded' });
                    });
                });
            }
        });
    });
});



app.get('/polls/vote_status', authenticate, (req, res) => {
    const { poll_id } = req.query;
    const user_id = req.user.userId;

    db.query('SELECT * FROM votes WHERE user_id = ? AND poll_id = ?', [user_id, poll_id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error fetching vote status' });

        if (results.length > 0) {
            res.json({ voted: true, option_id: results[0].option_id });
        } else {
            res.json({ voted: false });
        }
    });
});


app.get('/polls/results/:poll_id', authenticate, (req, res) => {
    const { poll_id } = req.params;

    db.query(
        `
        SELECT po.option_text, po.votes
        FROM polloptions po
        WHERE po.poll_id = ?
        `,
        [poll_id],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Database error retrieving poll results' });
            if (results.length === 0) return res.status(404).json({ error: 'Poll not found' });

            res.json(results);
        }
    );
});


app.get('/user', authenticate, (req, res) => {
    db.query('SELECT username, is_admin FROM users WHERE user_id = ?', [req.user.userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error fetching user details' });
        if (results.length === 0) return res.status(404).json({ error: 'User not found' });

        res.json({
            username: results[0].username,
            is_admin: results[0].is_admin
        });
    });
});


//admin route / authentication
app.get('/admin', authenticate, adminMiddleware, (req, res) => {
    res.json({ message: 'Welcome to the admin page', user: req.user });
});

// Route to create a new poll
app.post('/admin/create_poll', authenticate, adminMiddleware, (req, res) => {
    const { title, description, poll_type, deadline } = req.body;

    if (!title || !deadline || !poll_type) {
        return res.status(400).json({ error: 'Poll must have a title, type, and deadline' });
    }

    // Insert the new poll into the database
    db.query(
        'INSERT INTO polls (title, description, poll_type, deadline, created_by) VALUES (?, ?, ?, ?, ?)',
        [title, description, poll_type, deadline, req.user.userId],
        (err, result) => {
            if (err) return res.status(500).json({ error: 'Database error while creating poll' });

            const pollId = result.insertId;

            // Automatically insert "Yes" and "No" options for Yes/No polls
            if (poll_type === 'yes_no') {
                const options = ['Yes', 'No'];
                const optionQueries = options.map(option => {
                    return new Promise((resolve, reject) => {
                        db.query(
                            'INSERT INTO polloptions (poll_id, option_text) VALUES (?, ?)',
                            [pollId, option],
                            (err) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                });

                Promise.all(optionQueries)
                    .then(() => res.status(201).json({ message: 'Yes/No Poll created successfully', pollId }))
                    .catch(err => res.status(500).json({ error: 'Database error while adding options' }));
            } else {
                res.status(201).json({ message: 'Regular Poll created successfully', pollId });
            }
        }
    );
});


// Protected route
app.get('/protected', authenticate, (req, res) => {
    res.json({ message: 'This is a protected route', user: req.user });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
