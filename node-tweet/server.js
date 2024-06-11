require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const NodeCache = require('node-cache');
const TweetComment = require('./controller/tweetComments');
const TweetResponseModel = require('./models/tweetComments');

const PROTO_PATH = '../proto/tweet.proto';

// Load the protobuf file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const tweetProto = grpc.loadPackageDefinition(packageDefinition).tweet;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Initialize node-cache
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // Cache items expire after 600 seconds

// Define the gRPC method for getting tweet comments
async function getTweetComment(call, callback) {
  try {
    const url = call.request.url;

    // Check if the URL is in the cache
    const cachedResponse = cache.get(url);
    if (cachedResponse) {
      console.log('Returning cached response from node-cache');
      callback(null, cachedResponse);
      return;
    }

    // Check if the URL already exists in the database
    const existingResponse = await TweetResponseModel.findOne({ url });

    if (existingResponse) {
      console.log('Returning cached response from MongoDB');
      cache.set(url, existingResponse.toObject()); // Cache the database response
      callback(null, existingResponse.toObject());
    } else {
      // If not found, call the TweetComment function
      const comments = await TweetComment(url);
      const response = {
        url,
        type: 'comment',
        data: comments.map(comment => ({
          user: {
            name: comment.user.name,
            created_at: comment.user.created_at,
            screen_name: comment.user.screen_name,
            favourites_count: comment.user.favourites_count,
            followers_count: comment.user.followers_count,
            friends_count: comment.user.friends_count,
            url: comment.user.url,
          },
          views: comment.views,
          tweet: comment.tweet,
          like: comment.like,
          created_at: comment.created_at,
          id_comment: comment.id_comment,
        })),
      };

      // Cache the new response
      cache.set(url, response);

      callback(null, response);
    }
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err.message,
    });
  }
}

// Initialize and start the gRPC server
function main() {
  const server = new grpc.Server();
  server.addService(tweetProto.TweetService.service, { GetTweetComment: getTweetComment });

  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('Server binding failed:', err);
      return;
    }
    console.log(`Server running at http://0.0.0.0:${port}`);
    server.start();
  });
}

main();
