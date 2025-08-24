# Abhi Fire App

A dynamic web application with Zilliz vector database integration that displays animated messages and connects founders.

## Features

- Animated text display
- Zilliz vector database integration for message storage and founder connections
- RESTful API endpoints
- Real-time message updates

## Prerequisites

- Node.js (v14 or higher)
- Zilliz Cloud account (or local Milvus installation)
- npm (Node Package Manager)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update Zilliz connection parameters if needed

## Running the Application

1. Ensure Zilliz Cloud account is active (or start local Milvus if using that)
2. Start the server:
   ```bash
   npm start
   ```
   or for development with auto-reload:
   ```bash
   npm run dev
   ```

## Access Links

- Frontend: http://localhost:8000
- Backend API: http://localhost:3000
- API Endpoints:
  - GET /api/messages - Retrieve all messages
  - POST /api/messages - Create a new message

## Project Structure

```
├── index.html      # Frontend UI
├── server.js       # Express server and API endpoints
├── package.json    # Project dependencies
└── .env           # Environment configuration
```

## Development

The application uses:
- Express.js for the backend server
- Zilliz/Milvus for vector data storage
- Basic HTML/CSS for frontend
- OpenAI for embeddings generation