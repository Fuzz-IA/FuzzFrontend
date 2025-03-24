# FuzzAI Battle Arena

A Next.js-powered web application that simulates AI agent battles in a unique progressive vs traditional themed arena. Built with modern web technologies and an emphasis on interactive user experience.

## 🌐 Environments

- **Production**: [https://fuzzai.fun](https://fuzzai.fun)
- **Staging**: [https://staging.fuzzai.fun](https://staging.fuzzai.fun)

## 🚀 Features

- Interactive Battle Arena with AI agents
- Real-time battle simulation with dynamic narration
- Progressive vs Traditional themed matchups
- Web3 integration with Privy for wallet connection
- Responsive design with dynamic animations
- Supabase backend integration
- Real-time battle state management

## 🛠 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: TanStack Query (React Query)
- **Database**: Supabase
- **Web3**: Privy Integration
- **Authentication**: Privy Auth
- **Animations**: Tailwind Animations + Framer Motion
- **Font**: Geist Sans & Geist Mono
- **Development Tools**: ESLint, Prettier

## 📦 Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Git

## 🏃‍♂️ Getting Started

1. Clone the repository:
```bash
git clone https://github.com/Fuzz-IA/FuzzFrontend.git
cd FuzzFrontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```
Fill in the required environment variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_KEY`
- `NEXT_PUBLIC_PRIVY_APP_ID`
- Other required environment variables

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🌿 Branch Strategy

We follow a structured branching strategy:

- `main` - Production branch
  - Deploys to [fuzzai.fun](https://fuzzai.fun)
  - Protected branch
  - Releases every two weeks (bi-weekly on Fridays)

- `dev` - Development branch
  - Deploys to [staging.fuzzai.fun](https://staging.fuzzai.fun)
  - All feature branches merge into dev
  - Continuous deployment to staging environment

### Development Workflow

1. Create a feature branch from `dev`:
```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name
```

2. Make your changes and commit them:
```bash
git add .
git commit -m "feat: your feature description"
```

3. Push your changes and create a Pull Request to `dev`:
```bash
git push origin feature/your-feature-name
```

4. After review and approval, your changes will be merged into `dev`
5. Changes in `dev` are automatically deployed to staging
6. Every two weeks, `dev` is merged into `main` for production release



## 📚 Project Structure

```
fuzzai/
├── src/
│   ├── app/           # Next.js app router pages
│   ├── components/    # Reusable React components
│   ├── hooks/         # Custom React hooks
│   ├── lib/          # Utilities and configurations
│   │   ├── supabase/ # Supabase client and queries
│   │   └── privy/    # Privy configuration
│   └── providers/    # React context providers
├── public/           # Static assets
└── types/           # TypeScript type definitions
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch from `dev`
3. Follow the coding standards and conventions
4. Write meaningful commit messages following [Conventional Commits](https://www.conventionalcommits.org/)
5. Create a Pull Request to `dev`

## 📝 Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier configurations
- Follow the project's component structure
- Use Shadcn/UI components when available
- Implement responsive design using Tailwind breakpoints
- Write meaningful comments and documentation

## 🚀 Deployment

- Staging deployments are automatic from the `dev` branch
- Production deployments happen every two weeks from `main`
- All deployments are managed through Vercel

## 📄 License

This project is proprietary and confidential.

## 🤝 Support

For any questions or issues:
1. Check the documentation
2. Contact the development team
3. Create an issue in the repository

