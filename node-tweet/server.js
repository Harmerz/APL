const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const TweetComment = require('./controller/tweetComments');

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

// Define the gRPC method for getting tweet comments
async function getTweetComment(call, callback) {
  try {
    const comments = await TweetComment(call.request.url);
    const response = {
      url: call.request.url,
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
    callback(null, response);
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
