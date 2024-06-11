const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const puppeteer = require('puppeteer');

const PROTO_PATH = './tweet.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const tweetProto = grpc.loadPackageDefinition(packageDefinition).tweet;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function TweetComment(url) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  let responses = [];
  const userTweet = '/TweetDetail?variables=';

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes(userTweet)) {
      try {
        const responseBody = await response.json();
        const entries = responseBody.data.threaded_conversation_with_injections_v2.instructions[0].entries;
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
  });

  try {
    await page.goto(url, { timeout: 180000 });
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
    await page.setCookie(...cookies);
    await sleep(3000);
    await page.reload({ waitUntil: 'networkidle2' });
  } catch (error) {
    console.log('error', error);
  }
  await browser.close();
  return responses;
}

function getTweetComment(call, callback) {
  TweetComment(call.request.url).then(comments => {
    callback(null, { comments });
  }).catch(err => {
    callback(err);
  });
}

function main() {
  const server = new grpc.Server();
  server.addService(tweetProto.TweetService.service, { GetTweetComment: getTweetComment });
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    console.log('Server running at http://0.0.0.0:50051');
    server.start();
  });
}

main();
