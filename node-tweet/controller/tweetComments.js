const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function TweetComment(URLTweet) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const responses = [];
  const userTweet = '/TweetDetail?variables=';
  const cookies = [
    {
      name: 'auth_token',
      value: '566bdb9f1861d155e0eb3f4173a3ae9c0938dd29',
      domain: '.twitter.com',
    },
    {
      name: 'auth_token',
      value: '566bdb9f1861d155e0eb3f4173a3ae9c0938dd29',
      domain: '.x.com',
    },
  ];

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes(userTweet)) {
      try {
        const responseBody = await response.json();
        const entries = responseBody.data.threaded_conversation_with_injections_v2.instructions[0].entries;
        entries.forEach((entry) => {
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
        
            responses.push(
             
              tweetData
            );
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
  console.log(responses)
return responses
}

module.exports = TweetComment;
