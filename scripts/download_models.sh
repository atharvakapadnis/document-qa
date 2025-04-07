#!/bin/bash

# Exit on error
set -e

# Make sure ollama is running
if ! docker-compose ps | grep -q "ollama.*Up"; then
    echo "Starting Ollama service..."
    docker-compose up -d ollama
    echo "Waiting for Ollama to start..."
    sleep 10
fi

# Check if models are already downloaded
echo "Checking for existing models..."

# Pull embedding model if needed
if ! docker-compose exec ollama ollama list | grep -q "mxbai-embed-large"; then
    echo "Pulling embedding model (this may take a while)..."
    docker-compose exec ollama ollama pull mxbai-embed-large
else
    echo "Embedding model already downloaded."
fi

# Pull LLM model if needed
if ! docker-compose exec ollama ollama list | grep -q "llama3"; then
    echo "Pulling LLM model (this may take a while)..."
    docker-compose exec ollama ollama pull llama3
else
    echo "LLM model already downloaded."
fi

echo "All required models are available!"