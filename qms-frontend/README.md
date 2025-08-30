# QMS Frontend

Quality Management System - A modern web application built with Next.js, React, and TypeScript.

## Features

- **Authentication System** - Login and signup functionality
- **Modern UI** - Built with Tailwind CSS for responsive design
- **Type Safety** - Full TypeScript support
- **Form Validation** - React Hook Form integration
- **Quality Management Tools** - Streamlined processes and workflows

## Tech Stack

- **Framework**: Next.js 15.5.2
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.1.12
- **Forms**: React Hook Form
- **Authentication**: Supabase
- **Linting**: ESLint with Next.js rules

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
qms-frontend/
├── app/                    # Next.js app directory
│   ├── auth/              # Authentication pages
│   ├── components/        # Reusable components
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── public/                # Static assets
├── tailwind.config.js     # Tailwind configuration
├── next.config.ts         # Next.js configuration
└── tsconfig.json          # TypeScript configuration
```

## Development

This project uses the latest Next.js App Router and modern React patterns. The authentication system is ready for integration with Supabase or other backend services.
