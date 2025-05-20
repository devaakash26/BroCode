# NeetCode Platform

A full-stack Data Structures and Algorithms group challenge platform built with Next.js.

## Features

- 🔐 Authentication with Google and credentials
- 👥 Group creation and management
- 📝 DSA problem solving with Monaco editor
- 🏆 Timed coding challenges
- 📊 User progress tracking
- 🌓 Dark mode support
- 📱 Responsive design

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS, Monaco Editor
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Real-time**: Socket.io
- **Styling**: TailwindCSS, shadcn/ui

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database (or use Supabase as shown in setup)

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```
# NextAuth Configuration
NEXTAUTH_SECRET=your-nextauth-secret-key
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (optional but recommended)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Database Connection
DATABASE_URL="postgresql://username:password@localhost:5432/neetcode"

# Optional: Judge0 API (Code Execution)
JUDGE0_API_KEY=your-judge0-api-key
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/neetcode-platform.git
   cd neetcode-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up the database:
   ```bash
   npx prisma migrate dev --name init
   # or if using Supabase/other cloud providers, you might need:
   npx prisma db push
   ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
neetcode/
├── app/                  # Next.js app directory
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   ├── components/       # Reusable components
│   ├── dashboard/        # User dashboard
│   ├── groups/           # Group management
│   ├── problems/         # Problem solving
│   ├── admin/            # Admin dashboard
│   ├── lib/              # Utility functions
│   └── providers.jsx     # Context providers
├── components/           # shadcn UI components
├── prisma/               # Prisma schema and migrations
└── public/               # Static assets
```

## Deployment

This project can be deployed on platforms like Vercel, Netlify, or any other service that supports Next.js applications.

1. Set up environment variables on your hosting platform
2. Deploy using the platform's deployment process
3. Run database migrations if needed

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
