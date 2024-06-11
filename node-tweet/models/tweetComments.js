const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: String,
  created_at: String,
  screen_name: String,
  favourites_count: Number,
  followers_count: Number,
  friends_count: Number,
  url: String,
});

const tweetCommentSchema = new Schema({
  user: userSchema,
  views: String,
  tweet: String,
  like: Number,
  created_at: String,
  id_comment: String,
});

const tweetResponseSchema = new Schema({
  url: String,
  type: String,
  data: [tweetCommentSchema],
});

module.exports = mongoose.model('TweetResponse', tweetResponseSchema);
