const puppeteer = require('puppeteer')
const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

// Puppeteer script to capture network requests and process data
const TweetComment = async (url) => {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  let responses = []
  const userTweet = '/TweetDetail?variables='
  // Listen to all network responses
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes(userTweet)) {
      try {
          // x.data.threaded_conversation_with_injections_v2.instructions[0].entries[8].core.user_results.result
            const responseBody = await response.json();
          const entries = responseBody.data.threaded_conversation_with_injections_v2.instructions[0].entries;
          console.log(entries)
            entries.forEach(entry => {
                const tweetResult = entry?.content?.items?.[0]?.item?.itemContent?.tweet_results?.result;
              if (tweetResult) {
                responses.push({
                  user: tweetResult.core.user_results.result,
                  views: tweetResult.views,
                  tweet: tweetResult.legacy
              });
                }
            });
        } catch (err) {
            console.error(`Error loading body for request to ${url}:`, err);
        }
    }
  })
  try {
    // Navigate to a webpage
    await page.goto(url, { timeout: 180000 })

    // Set the cookie
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
    ]
    await page.setCookie(...cookies)

    // Refresh the page to ensure the cookie is used
    await sleep(3000)
    await page.reload({ waitUntil: 'networkidle2' })
  } catch (error) {
    console.log('error', error)
  }
  browser.close()
  console.log(responses)
  return responses
}

TweetComment('https://x.com/PaddleHQ/status/1800160489479025031')
