const mysql = require('mysql2');
const express = require('express');
require('dotenv').config();
const app = express();
const port = 3000;


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

app.get('/urls', (req, res) => {
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

//  Database connection setup

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'mobilememe'
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