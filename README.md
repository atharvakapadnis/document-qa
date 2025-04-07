# Document Q&A System

A local document question-answering system built with FastAPI, React, and Ollama.

## Overview

This application allows you to upload documents and ask questions about them using local language models. The system uses:

- **FastAPI** for the backend API
- **React** for the frontend interface
- **Ollama** for local LLM inference
- **ChromaDB** as the vector database
- **RAG (Retrieval-Augmented Generation)** methodology for accurate answers

## Features

- Upload and manage documents (PDF, DOCX, TXT, CSV)
- Ask questions about your documents
- User authentication
- Document tagging and organization
- Local processing (no data sent to external APIs)

## Prerequisites

- Docker and Docker Compose

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/document-qa-system.git
   cd document-qa-system
   ```

2. Run the setup script:
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - API Documentation: http://localhost:8000/docs

4. Log in with the default credentials:
   - Username: admin
   - Password: password

## Manual Setup

1. Create necessary directories:
   ```bash
   mkdir -p document_storage chroma_db db
   ```

2. Create environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start the services:
   ```bash
   docker-compose up -d
   ```

4. Download required models:
   ```bash
   chmod +x scripts/download_models.sh
   ./scripts/download_models.sh
   ```

## Usage

1. Register a new account or log in
2. Upload documents on the dashboard
3. Navigate to the Chat interface
4. Ask questions about your documents

## Production Deployment

For production deployment, use the production Docker Compose file:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Configuration

Edit the `.env` file to configure:

- Secret key
- Storage paths
- LLM and embedding models

## Low-Cost Deployment Options

### Option 1: Self-hosted on a Small VPS

- Digital Ocean Droplet ($5-10/month)
- Linode Basic ($5-10/month)
- Oracle Cloud Free Tier (Always Free)

### Option 2: Local Deployment

- Run on your personal computer
- Install Docker and Docker Compose
- Use the development configuration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.