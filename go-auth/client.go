package main

import (
	"context"
	"log"
	"time"

	pb "APL/go-auth/pb/inventory"

	"google.golang.org/grpc"
)

const (
	address    = "localhost:50051"
	retryCount = 3
	timeout    = 30 * time.Second // Increased timeout
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
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	url := "https://x.com/PaddleHQ/status/1800160489479025031"

	var r *pb.TweetResponse
	for i := 0; i < retryCount; i++ {
		r, err = client.GetTweetComment(ctx, &pb.TweetRequest{Url: url})
		if err == nil {
			break
		}
		if i < retryCount-1 {
			log.Printf("Retrying due to error: %v", err)
			time.Sleep(time.Duration(i+1) * time.Second) // Exponential backoff
		} else {
			log.Fatalf("could not get tweet comments: %v", err)
		}
	}

	if r != nil {
		log.Printf("URL: %v", r.GetUrl())
		log.Printf("Type: %v", r.GetType())
		for _, comment := range r.GetData() {
			user := comment.GetUser()
			log.Printf("User Name: %v", user.GetName())
			log.Printf("User Created At: %v", user.GetCreatedAt())
			log.Printf("User Screen Name: %v", user.GetScreenName())
			log.Printf("User Favourites Count: %v", user.GetFavouritesCount())
			log.Printf("User Followers Count: %v", user.GetFollowersCount())
			log.Printf("User Friends Count: %v", user.GetFriendsCount())
			log.Printf("User URL: %v", user.GetUrl())
			log.Printf("Views: %v", comment.GetViews())
			log.Printf("Tweet: %v", comment.GetTweet())
			log.Printf("Like: %v", comment.GetLike())
			log.Printf("Created At: %v", comment.GetCreatedAt())
			log.Printf("ID Comment: %v", comment.GetIdComment())
		}
	}
}
