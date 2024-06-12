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

// Define the gRPC method for adding tweet comments
async function addTweetComment(call, callback) {
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
      
  const tweetResponse = {
    url: url,
    type: 'comment',
    data: comments,
  };

  try {
    // Save to MongoDB
    const tweetResponseDocument = new TweetResponseModel(tweetResponse);
    await tweetResponseDocument.save();
    console.log('Data saved to MongoDB:', tweetResponse);
  } catch (error) {
    console.error('Error saving to MongoDB:', error);
  }

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

// Define the gRPC method for reading all comments
async function readAllComments(call, callback) {
  try {
    console.log('Get all responses')
    const cacheKey = 'all_comments';
    const cachedResponse = cache.get(cacheKey);

    if (cachedResponse) {
      console.log('Returning cached response for all comments');
      callback(null, cachedResponse);
      return;
    }
    const comments = await TweetResponseModel.find();
     // Construct the response object with the expected structure
     const response = {
      tweets: comments.map(comment => ({
        url: comment.url,
        type: 'comment',
        data: comment.data.map(dataItem => ({
          user: {
            name: dataItem.user.name,
            created_at: dataItem.user.created_at,
            screen_name: dataItem.user.screen_name,
            favourites_count: dataItem.user.favourites_count,
            followers_count: dataItem.user.followers_count,
            friends_count: dataItem.user.friends_count,
            url: dataItem.user.url,
          },
          views: dataItem.views,
          tweet: dataItem.tweet,
          like: dataItem.like,
          created_at: dataItem.created_at,
          id_comment: dataItem.id_comment,
        })),
      })),
    };

    console.log(response)
    callback(null, response);
    // Store the response in the cache
    cache.set(cacheKey, response, cache.DefaultExpiration);

    callback(null, response);
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err.message,
    });
  }
}



// Define the gRPC method for updating a tweet comment by URL
async function updateTweetComment(call, callback) {
  try {
    const url = call.request.url;
    // Check if the URL exists in the database
    const findURL = await TweetResponseModel.findOne({ url });
    if (!findURL) {
      console.log(`URL not found: ${url}`);
      callback({
        code: grpc.status.NOT_FOUND,
        message: 'Comment not found',
        });
        return;
        }
      const comments = await TweetComment(url);
    console.log(comments)
    const tweetResponse = {
      url: url,
      type: 'comment',
      data: comments,
    };
    const updatedComment = await TweetResponseModel.findOneAndUpdate({ url }, tweetResponse, { new: true });
    console.log(`Successfully updated comment with updatedComment: ${updatedComment}`);

    if (updatedComment) {
     // If not found, call the TweetComment function
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
    }
    // Cache the new response
    cache.set(url, response);
    console.log(`Successfully updated comment with URL: ${url}`);

    callback(null, response);
   }
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err.message,
    });
  }
}

// Define the gRPC method for deleting a tweet comment by URL
async function deleteTweetComment(call, callback) {
  try {
    const { url } = call.request;
    const deletedComment = await TweetResponseModel.findOneAndDelete({ url });

    if (deletedComment) {
      cache.del(url); // Remove from cache
      callback(null, { message: 'Comment deleted' });
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        message: 'Comment not found',
      });
    }
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err.message,
    });
  }
}

// Initialize and start the gRPC server
function NodeGPRC() {
  const server = new grpc.Server();
  server.addService(tweetProto.TweetService.service, {
    AddTweetComment: addTweetComment,
    ReadAllComments: readAllComments,
    UpdateTweetComment: updateTweetComment,
    DeleteTweetComment: deleteTweetComment,
  });

  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('Server binding failed:', err);
      return;
    }
    console.log(`Server running at http://0.0.0.0:${port}`);
    server.start();
  });
}

exports.module = NodeGPRC
