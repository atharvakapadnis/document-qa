#!/bin/bash

# Exit on error
set -e

# Create necessary directories
mkdir -p document_storage
mkdir -p chroma_db
mkdir -p db

# Copy env file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo ".env file created from example. Please review and update it if needed."
fi

# Initialize ollama models
echo "Setting up Ollama models..."
docker-compose up -d ollama
echo "Waiting for Ollama to start..."
sleep 10

# Pull required models
echo "Pulling embedding model (this may take a while)..."
docker-compose exec ollama ollama pull mxbai-embed-large

echo "Pulling LLM model (this may take a while)..."
docker-compose exec ollama ollama pull llama3

echo "Models downloaded successfully!"

# Start the application
echo "Starting the application..."
docker-compose up -d

echo "Setup complete! You can access the application at:"
echo "Frontend: http://localhost:3000"
echo "API: http://localhost:8000/docs"
echo ""
echo "Default login:"
echo "Username: admin"
echo "Password: password"