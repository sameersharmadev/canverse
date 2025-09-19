<p align="center">
  <img width="400" height="60" alt="New Project (1)" src="https://github.com/user-attachments/assets/2d1442c4-e57a-4aeb-b77a-a08456bac58f" />
</p>

<p align="center">
  <b>Canverse</b> is a collaborative online whiteboard that supports real-time drawing, voice chat, and multi-user presence, ideal for remote teams, classrooms, and creative collaboration.
</p>


<img width="1364" height="649" alt="Screenshot From 2025-09-14 17-20-40" src="https://github.com/user-attachments/assets/8d59fc7e-13c5-4993-a438-29e7246c3109" />


## Features
- **Real-time drawing:** Pen, eraser, shapes, arrows, and text tools.
- **Selection & transformation:** Select, move, resize, and delete elements.
- **Multi-user presence:** See other users' cursors and avatars live.
- **Voice chat:** Join a voice channel for seamless audio collaboration.
- **Room system:** Create or join rooms via invite links.

## Tech Stack
- **Frontend:** React, TypeScript, Konva, TailwindCSS
- **Backend:** Node.js, Express, Socket.IO, Redis

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Local Development

1. **Clone the repository:**
   ```sh
   git clone https://github.com/sameersharmadev/canverse.git
   cd canverse
   ```

2. **Install dependencies:**
   ```sh
   npm install
   cd backend
   npm install
   cd ..
   ```

3. **Configure environment variables:**

   #### Frontend (`.env` in project root)
   ```
   VITE_BACKEND_URL=http://localhost:3001
   ```
   Replace with your backend URL in production.

   #### Backend (`backend/.env`)
   ```
   CLIENT_URL=http://localhost:5173
   PORT=3001
   HOST=0.0.0.0
   REDIS_URL=your-redis-url
   NODE_ENV=development
   ```
   Replace with your actual frontend URL, Redis credentials, and production values as needed.

4. **Start the backend:**
   ```sh
   cd backend
   npm run dev
   ```

5. **Start the frontend:**
   ```sh
   npm run dev
   ```

6. **Open [http://localhost:5173](http://localhost:5173) in your browser.**

### Production Deployment
- **Frontend:** Deploy the `dist/` folder using Vercel, Netlify, or any static host.
- **Backend:** Deploy the backend (Node.js server) on Render, Google Cloud, or any VM.  
  Make sure to set environment variables and open necessary ports.

## Project Structure
```
canverse/
  ├── backend/           # Node.js backend
  ├── src/               # React frontend
  ├── public/            # Static assets
  ├── package.json
  ├── tsconfig*.json
  ├── vite.config.ts
  └── README.md
```

## ❤️ Contributing
Pull requests and issues are welcome! No strict guidelines for commit messages or pull requests, just make sure it's clear and understandable.