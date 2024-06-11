const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Load the protobuf
const packageDefinition = protoLoader.loadSync('example.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const exampleProto = grpc.loadPackageDefinition(packageDefinition).example;

// Create a client
const client = new exampleProto.Greeter('localhost:50051', grpc.credentials.createInsecure());

// Call the SayHello RPC method
client.sayHello({ name: 'World' }, (error, response) => {
  if (!error) {
    console.log('Greeting:', response.message);
  } else {
    console.error(error);
  }
});
