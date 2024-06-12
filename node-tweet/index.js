const express = require('express');
const cors = require('cors');
const NodeGPRC = require('./server')
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Connected to MongoDB'));

// Tweet model
const TweetResponseModel = require('./models/tweetComments');

// Route to get a specific tweet by URL
app.post('/api/tweet', async (req, res) => {
  const { url } = req.body;

  try {
    const tweet = await TweetResponseModel.findOne({ url });

    if (!tweet) {
      return res.status(404).json({ message: 'Tweet not found' });
    }

    res.json(tweet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

NodeGPRC()
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
