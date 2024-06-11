package main

import (
	"context"
	"log"
	"time"

	pb "github.com/Harmerz/APL/proto" // Update with the correct module path

	"google.golang.org/grpc"
)

const (
	address = "localhost:50051"
)

func main() {
	// Set up a connection to the server.
	conn, err := grpc.Dial(address, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()
	client := pb.NewTweetServiceClient(conn)

	// Contact the server and print out its response.
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	url := "https://x.com/PaddleHQ/status/1800160489479025031"
	r, err := client.GetTweetComment(ctx, &pb.TweetRequest{Url: url})
	if err != nil {
		log.Fatalf("could not get tweet comments: %v", err)
	}
	log.Printf("Tweet Comments: %v", r.GetComments())
}
