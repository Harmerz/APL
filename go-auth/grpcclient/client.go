package grpcclient

import (
	"context"
	"log"
	"time"

	pb "APL/go-auth/pb/inventory"
	"github.com/patrickmn/go-cache"
	"google.golang.org/grpc"
)

const (
	address    = "localhost:50051"
	retryCount = 3
	timeout    = 30 * time.Second // Increased timeout
)

// GRPCClient is a wrapper for the gRPC client and cache
type GRPCClient struct {
	client pb.TweetServiceClient
	cache  *cache.Cache
}

// NewGRPCClient creates a new gRPC client
func NewGRPCClient() (*GRPCClient, error) {
	// Set up a connection to the server.
	conn, err := grpc.Dial(address, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		return nil, err
	}

	client := pb.NewTweetServiceClient(conn)
	c := cache.New(10*time.Minute, 30*time.Minute)

	return &GRPCClient{
		client: client,
		cache:  c,
	}, nil
}

// GetTweetComment retrieves tweet comments, with caching and retries
func (g *GRPCClient) GetTweetComment(url string) (*pb.TweetResponse, error) {
	// Try to get from cache
	if cachedResponse, found := g.cache.Get(url); found {
		return cachedResponse.(*pb.TweetResponse), nil
	}

	// Contact the server and print out its response.
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	var r *pb.TweetResponse
	var err error
	for i := 0; i < retryCount; i++ {
		r, err = g.client.GetTweetComment(ctx, &pb.TweetRequest{Url: url})
		if err == nil {
			break
		}
		if i < retryCount-1 {
			log.Printf("Retrying due to error: %v", err)
			time.Sleep(time.Duration(i+1) * time.Second) // Exponential backoff
		}
	}

	if err != nil {
		return nil, err
	}

	// Store the response in the cache
	g.cache.Set(url, r, cache.DefaultExpiration)

	return r, nil
}
