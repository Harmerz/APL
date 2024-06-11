package main

import (
	"log"
	"os"

	"APL/go-auth/grpcclient"
	"APL/go-auth/handlers"
	"github.com/gofiber/fiber/v2"
	jwtware "github.com/gofiber/jwt/v3"
	jwt "github.com/golang-jwt/jwt/v4"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	// Initialize the database connection
	handlers.InitDB()

	// Initialize gRPC client
	grpcClient, err := grpcclient.NewGRPCClient()
	if err != nil {
		log.Fatalf("Failed to initialize gRPC client: %v", err)
	}

	app := fiber.New()

	// Public routes
	app.Post("/login", handlers.Login)
	app.Post("/register", handlers.Register)

	// JWT Middleware for restricted routes
	restricted := app.Group("/api")
	restricted.Use(jwtware.New(jwtware.Config{
		SigningKey:   []byte(os.Getenv("JWT_SECRET")),
		ErrorHandler: jwtError,
	}))

	// Restricted tweetcomment endpoint
	restricted.Post("/tweetcomment", func(c *fiber.Ctx) error {
		var request struct {
			URL string `json:"url"`
		}

		if err := c.BodyParser(&request); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
		}

		response, err := grpcClient.GetTweetComment(request.URL)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(response)
	})

	// Restricted route
	restricted.Get("/", restrictedHandler)

	log.Fatal(app.Listen(":6000"))
}

func jwtError(c *fiber.Ctx, err error) error {
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).SendString(err.Error())
	}
	return nil
}

func restrictedHandler(c *fiber.Ctx) error {
	user := c.Locals("user").(*jwt.Token)
	claims := user.Claims.(jwt.MapClaims)
	name := claims["name"].(string)

	return c.SendString("Welcome " + name)
}
