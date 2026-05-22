const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const userRoutes = require('./src/routes/userRoutes');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/users', userRoutes);

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = parseInt(process.env.PORT) || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;