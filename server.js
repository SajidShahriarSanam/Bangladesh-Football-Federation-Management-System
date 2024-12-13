const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
app.use(cors()); // Allow front-end communication
app.use(bodyParser.json()); // Parse JSON data from requests
app.use(express.json());
app.use(cors({ origin: '*' }));


const db = mysql.createConnection({
    host: 'localhost',   // Database server (usually 'localhost')
    user: 'root',        // Replace with your MySQL username
    password: '@Sanam01821489035',        // Replace with your MySQL password
    database: 'Fedaration_Management_System'   // Replace with your database name
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to the database.');
});

// API endpoint to fetch teams with players and coach
app.get('/teams', (req, res) => {
    const query = `
        SELECT 
            t.team_id, t.name AS team_name, t.city, t.foundation_year,
            c.name AS coach_name, c.experience,
            p.name AS player_name, p.position
        FROM Teams t
        LEFT JOIN Coaches c ON t.coach_id = c.coach_id
        LEFT JOIN Players p ON t.team_id = p.team_id
        ORDER BY t.team_id, p.name;
    `;

    db.query(query, (err, results) => {
        if (err) {
            res.status(500).send('Error fetching data');
        } else {
            // Group results by team
            const teams = {};
            results.forEach(row => {
                if (!teams[row.team_id]) {
                    teams[row.team_id] = {
                        team_name: row.team_name,
                        city: row.city,
                        foundation_year: row.foundation_year,
                        coach_name: row.coach_name,
                        players: []
                    };
                }
                if (row.player_name) {
                    teams[row.team_id].players.push({
                        name: row.player_name,
                        position: row.position
                    });
                }
            });
            res.json(Object.values(teams));
        }
    });
});

app.post('/teams', (req, res) => {
    const { name, city, foundation_year, coach, players } = req.body;

    // Start a transaction to ensure atomicity
    db.beginTransaction(err => {
        if (err) return res.status(500).send('Transaction error');

        // Insert coach
        const coachQuery = `INSERT INTO Coaches (name, experience) VALUES (?, ?)`;
        db.query(coachQuery, [coach.name, coach.experience], (err, coachResult) => {
            if (err) {
                return db.rollback(() => res.status(500).send('Error adding coach'));
            }

            const coachId = coachResult.insertId;

            // Insert team
            const teamQuery = `INSERT INTO Teams (name, city, foundation_year, coach_id) VALUES (?, ?, ?, ?)`;
            db.query(teamQuery, [name, city, foundation_year, coachId], (err, teamResult) => {
                if (err) {
                    return db.rollback(() => res.status(500).send('Error adding team'));
                }

                const teamId = teamResult.insertId;

                // Insert players
                if (players && players.length > 0) {
                    const playerQueries = players.map(player => {
                        return new Promise((resolve, reject) => {
                            const playerQuery = `
                                INSERT INTO Players (name, position, team_id) VALUES (?, ?, ?)
                            `;
                            db.query(playerQuery, [player.name, player.position, teamId], err => {
                                if (err) reject(err);
                                else resolve();
                            });
                        });
                    });

                    Promise.all(playerQueries)
                        .then(() => {
                            db.commit(err => {
                                if (err) {
                                    return db.rollback(() => res.status(500).send('Commit error'));
                                }
                                res.status(201).json({ message: 'Team, Coach, and Players added successfully' });
                            });
                        })
                        .catch(err => {
                            db.rollback(() => res.status(500).send('Error adding players'));
                        });
                } else {
                    db.commit(err => {
                        if (err) {
                            return db.rollback(() => res.status(500).send('Commit error'));
                        }
                        res.status(201).json({ message: 'Team and Coach added successfully, no players' });
                    });
                }
            });
        });
    });
});

// GET endpoint for stadiums
app.get('/stadiums', (req, res) => {
    const query = 'SELECT * FROM Stadiums';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching stadiums:', err);
            return res.status(500).send('Error fetching stadiums');
        }
        res.json(results);
    });
});


// Create a new stadium
app.post('/stadiums', (req, res) => {
    const { name, capacity, location, description } = req.body;
    const query = 'INSERT INTO Stadiums (name, capacity, location, description) VALUES (?, ?, ?, ?)';
    db.query(query, [name, capacity, location, description], (err, result) => {
        if (err) {
            res.status(500).send('Error adding stadium.');
        } else {
            res.json({ message: 'Stadium added successfully!', stadiumId: result.insertId });
        }
    });
});

// Update a stadium
app.put('/stadiums/:id', (req, res) => {
    const { id } = req.params;
    const { name, capacity, location, description } = req.body;
    const query = 'UPDATE Stadiums SET name = ?, capacity = ?, location = ?, description = ? WHERE stadium_id = ?';
    db.query(query, [name, capacity, location, description, id], (err) => {
        if (err) {
            res.status(500).send('Error updating stadium.');
        } else {
            res.json({ message: 'Stadium updated successfully!' });
        }
    });
});

// Delete a stadium
app.delete('/stadiums/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM Stadiums WHERE stadium_id = ?';
    db.query(query, [id], (err) => {
        if (err) {
            res.status(500).send('Error deleting stadium.');
        } else {
            res.json({ message: 'Stadium deleted successfully!' });
        }
    });
});

// Fetch all tournaments
app.get('/tournaments', (req, res) => {
    const query = 'SELECT * FROM Tournaments';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch tournaments' });
        res.json(results);
    });
});

// Add a new tournament
app.post('/tournaments', (req, res) => {
    const { name, start_date, end_date, type, description } = req.body;
    const query = 'INSERT INTO Tournaments (name, start_date, end_date, type, description) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [name, start_date, end_date, type, description], (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to add tournament' });
        res.json({ message: 'Tournament added successfully', insertId: result.insertId });
    });
});

// Update a tournament
app.put('/tournaments/:id', (req, res) => {
    const { id } = req.params;
    const { name, start_date, end_date, type, description } = req.body;
    const query = 'UPDATE Tournaments SET name = ?, start_date = ?, end_date = ?, type = ?, description = ? WHERE tournament_id = ?';
    db.query(query, [name, start_date, end_date, type, description, id], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update tournament' });
        res.json({ message: 'Tournament updated successfully' });
    });
});

// Delete a tournament
app.delete('/tournaments/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM Tournaments WHERE tournament_id = ?';
    db.query(query, [id], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete tournament' });
        res.json({ message: 'Tournament deleted successfully' });
    });
});


// 1. Get all media records
// 1. Get all media records
app.get('/media', (req, res) => {
    const query = 'SELECT * FROM Media';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching media:', err);
            res.status(500).json({ error: 'Failed to fetch media' });
            return;
        }
        res.json(results);
    });
});


// Create a new media record
app.post('/media', (req, res) => {
    const { name, type, contact_info, description } = req.body;

    console.log('Received POST request to add media:', req.body); // Log the received data

    // Validate inputs
    if (!name || !type || !contact_info || !description) {
        console.error('Validation error: Missing required fields');
        res.status(400).json({ error: 'All fields are required!' });
        return;
    }

    const query = 'INSERT INTO Media (name, type, contact_info, description) VALUES (?, ?, ?, ?)';
    db.query(query, [name, type, contact_info, description], (err, result) => {
        if (err) {
            console.error('Error inserting media into database:', err); // Log SQL error
            res.status(500).json({ error: 'Failed to add media' });
            return;
        }

        console.log('Media added successfully with ID:', result.insertId); // Log success
        res.json({ message: 'Media added successfully', id: result.insertId });
    });
});


// 3. Update a media record
app.put('/media/:id', (req, res) => {
    const { id } = req.params;
    const { name, type, contact_info, description } = req.body;
    const query = 'UPDATE Media SET name = ?, type = ?, contact_info = ?, description = ? WHERE media_id = ?';
    db.query(query, [name, type, contact_info, description, id], (err, result) => {
        if (err) {
            console.error('Error updating media:', err);
            res.status(500).json({ error: 'Failed to update media' });
            return;
        }
        res.json({ message: 'Media updated successfully' });
    });
});


// Delete a media record
app.delete('/media/:id', (req, res) => {
    const { id } = req.params;

    if (!id) {
        res.status(400).json({ error: 'Media ID is required' });
        return;
    }

    const query = 'DELETE FROM Media WHERE media_id = ?';
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error deleting media:', err);
            res.status(500).json({ error: 'Failed to delete media' });
            return;
        }

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Media not found' });
            return;
        }

        res.json({ message: 'Media deleted successfully' });
    });
});


// Route to fetch matches
app.get("/matches", (req, res) => {
    const sql = `
        SELECT 
            m.match_id, 
            t.name AS tournament_name, 
            s.name AS stadium_name, 
            o.name AS official_name, 
            IFNULL(m.date, 'TBD') AS date,
            IFNULL(m.time, 'TBD') AS time,
            GROUP_CONCAT(DISTINCT t1.name SEPARATOR ' vs ') AS teams
        FROM Matches m
        LEFT JOIN Tournaments t ON m.tournament_id = t.tournament_id
        LEFT JOIN Stadiums s ON m.stadium_id = s.stadium_id
        LEFT JOIN Officiates o_ref ON m.match_id = o_ref.match_id
        LEFT JOIN Officials o ON o_ref.official_id = o.official_id
        LEFT JOIN Play p1 ON m.match_id = p1.match_id
        LEFT JOIN Teams t1 ON p1.team_id = t1.team_id
        GROUP BY m.match_id, t.name, s.name, o.name
        ORDER BY m.date ASC;
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching matches:", err);
            res.status(500).json({ error: "Database query failed" });
        } else {
            res.json(results);
        }
    });
});

















app.get("/api/teams", (req, res) => {
    const query = "SELECT * FROM Teams;";
    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching teams:", err);
            return res.status(500).json({ error: err.message });
        }
        console.log("Teams fetched:", results);
        res.json(results);
    });
});

// Players API
app.get("/api/players", (req, res) => {
    const query = `
        SELECT Players.player_id, Players.name, Players.nationality, Players.age, 
               Players.position, Teams.name AS team 
        FROM Players 
        LEFT JOIN Teams ON Players.team_id = Teams.team_id;
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching players:", err);
            return res.status(500).json({ error: err.message });
        }
        console.log("Players fetched successfully:", results);
        res.json(results);
    });
});

// Tournaments API
app.get("/api/tournaments", (req, res) => {
    const query = `
        SELECT tournament_id, name, type, start_date, end_date, description 
        FROM Tournaments;
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching tournaments:", err);
            return res.status(500).json({ error: err.message });
        }
        console.log("Tournaments fetched successfully:", results);
        res.json(results);
    });
});

// Matches API
app.get("/api/matches", (req, res) => {
    const query = `
        SELECT Matches.match_id, Matches.date, Matches.time, 
               Stadiums.name AS stadium, Tournaments.name AS tournament 
        FROM Matches 
        LEFT JOIN Stadiums ON Matches.stadium_id = Stadiums.stadium_id 
        LEFT JOIN Tournaments ON Matches.tournament_id = Tournaments.tournament_id;
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching matches:", err);
            return res.status(500).json({ error: err.message });
        }
        console.log("Matches fetched successfully:", results);
        res.json(results);
    });
});

// Media API
app.get("/api/media", (req, res) => {
    const query = `
        SELECT media_id, name, type, contact_info, description 
        FROM Media;
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching media:", err);
            return res.status(500).json({ error: err.message });
        }
        console.log("Media fetched successfully:", results);
        res.json(results);
    });
});

// Stadiums API
app.get("/api/stadiums", (req, res) => {
    const query = `
        SELECT stadium_id, name, capacity, location, description 
        FROM Stadiums;
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching stadiums:", err);
            return res.status(500).json({ error: err.message });
        }
        console.log("Stadiums fetched successfully:", results);
        res.json(results);
    });
});









  

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
