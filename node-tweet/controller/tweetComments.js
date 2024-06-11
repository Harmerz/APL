require('dotenv').config();
const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const TweetResponseModel = require('../models/tweetComments');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function TweetComment(URLTweet) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const responses = [];
  const userTweet = '/TweetDetail?variables=';
  const cookies = [
    {
      name: 'auth_token',
      value: process.env.AUTH_TOKEN,
      domain: '.twitter.com',
    },
    {
      name: 'auth_token',
      value: process.env.AUTH_TOKEN,
      domain: '.x.com',
    },
  ];

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes(userTweet)) {
      try {
        const responseBody = await response.json();
        const entries = responseBody.data.threaded_conversation_with_injections_v2.instructions[0].entries;
        entries.forEach(entry => {
          const tweetResult = entry?.content?.items?.[0]?.item?.itemContent?.tweet_results?.result;

          if (tweetResult) {
            const user = tweetResult.core.user_results.result.legacy;
            const tweetLegacy = tweetResult.legacy;
            const tweetData = {
              user: {
                name: user.name,
                created_at: user.created_at,
                screen_name: user.screen_name,
                favourites_count: user.favourites_count,
                followers_count: user.followers_count,
                friends_count: user.friends_count,
                url: user.url,
              },
              views: tweetResult.views?.count,
              tweet: tweetLegacy.full_text,
              like: tweetLegacy.favorite_count,
              created_at: tweetLegacy.created_at,
              id_comment: tweetLegacy.conversation_id_str,
            };

            responses.push(tweetData);
          }
        });
      } catch (err) {
        console.error(`Error loading body for request to ${url}:`, err);
      }
    }
  });

  try {
    await page.setCookie(...cookies);
    await page.goto(URLTweet, { timeout: 180000 });
    await sleep(3000);
  } catch (error) {
    console.log('Error during page navigation:', error);
  } finally {
    await browser.close();
  }

  const tweetResponse = {
    url: URLTweet,
    type: 'comment',
    data: responses,
  };

  try {
    // Save to MongoDB
    const tweetResponseDocument = new TweetResponseModel(tweetResponse);
    await tweetResponseDocument.save();
    console.log('Data saved to MongoDB:', tweetResponse);
  } catch (error) {
    console.error('Error saving to MongoDB:', error);
  }

  return responses;
}

module.exports = TweetComment;
