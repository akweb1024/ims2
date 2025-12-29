# STM Customer Management System

A comprehensive web application for managing journal subscriptions, customers, sales channels, and analytics.

## 🚀 Features

### Phase 1 (MVP) - Currently Implemented

- ✅ **User Authentication & Authorization**
  - Registration with customer type selection (Individual/Institution/Agency)
  - JWT-based authentication
  - Role-Based Access Control (RBAC)
  
- ✅ **Customer Management**
  - Self-registration and profile management
  - Support for Individuals, Institutions, and Agencies
  - Customer profile updates
  
- ✅ **Database Schema**
  - Complete Prisma schema covering all entities
  - User, CustomerProfile, Journal, Subscription, Invoice, Payment
  - Communication logs, Tasks, and Audit trails
  
- ✅ **Dashboard**
  - Role-based navigation
  - Statistics overview
  - Recent activity feed
  - Upcoming renewals tracking

### Upcoming Features (Phase 2 & 3)

- 📋 Subscription lifecycle management
- 📰 Journal catalog management
- 💳 Invoice and payment processing
- 📊 Advanced analytics and reporting
- 📧 Email templates and automated reminders
- 🤝 Agency commission management
- 🔔 Renewal reminder system

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (React), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt password hashing
- **Styling**: Tailwind CSS with custom design system

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+

### Setup Steps

1. **Clone and navigate to the project**
   ```bash
   cd /home/itb-09/Desktop/architecture/stmCustomer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL database**
   ```bash
   # Create a PostgreSQL database named 'stm_customer'
   createdb stm_customer
   ```

4. **Configure environment variables**
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Edit .env and update DATABASE_URL with your PostgreSQL credentials
   # Format: postgresql://username:password@localhost:5432/stm_customer
   ```

5. **Generate Prisma client and push schema to database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

## 📊 Database Management

### Prisma Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to database (development)
npm run prisma:push

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Create and apply migrations (production)
npx prisma migrate dev --name init
```

## 🔐 User Roles & Permissions

1. **CUSTOMER** - Manage own profile and subscriptions
2. **AGENCY** - Manage clients and agency subscriptions
3. **SALES_EXECUTIVE** - Manage assigned customers and create subscriptions
4. **MANAGER** - Oversee team performance and analytics
5. **FINANCE_ADMIN** - Manage invoices and payments
6. **SUPER_ADMIN** - Full system access

## 🎨 Design System

The application features a premium design system with:

- **Color Palette**: Primary (Blue), Success (Green), Warning (Yellow), Danger (Red)
- **Typography**: Inter font family
- **Components**: Reusable buttons, cards, forms, badges, tables
- **Animations**: Fade-in, slide-in, and subtle pulse effects
- **Responsive**: Mobile-first design approach

## 📁 Project Structure

```
stmCustomer/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Dashboard pages
│   │   ├── login/        # Login page
│   │   ├── register/     # Registration page
│   │   ├── globals.css   # Global styles
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Landing page
│   ├── components/
│   │   ├── dashboard/    # Dashboard components
│   │   └── ui/           # Reusable UI components
│   ├── lib/
│   │   ├── auth.ts       # Authentication utilities
│   │   └── prisma.ts     # Prisma client
│   └── types/
│       └── index.ts      # TypeScript types
├── prisma/
│   └── schema.prisma     # Database schema
├── public/               # Static assets
├── .env.example          # Environment variables template
├── next.config.js        # Next.js configuration
├── tailwind.config.ts    # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Code Quality

- **TypeScript**: Strict mode enabled for type safety
- **ESLint**: Code linting and formatting
- **Prisma**: Type-safe database access

## 🌐 Environment Variables

Create a `.env` file based on `.env.example`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/stm_customer?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

## 📖 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Coming Soon

- Customer management endpoints
- Subscription management endpoints
- Journal catalog endpoints
- Analytics endpoints

## 🚧 Roadmap

### Phase 1 (Current) ✅
- User authentication
- Customer registration
- Basic dashboard
- Database schema

### Phase 2 (Next)
- Subscription management
- Journal catalog
- Invoice/Payment system
- Communication logging

### Phase 3 (Future)
- Advanced analytics
- Email automation
- Agency commission tracking
- Report generation

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ using Next.js, TypeScript, and Tailwind CSS**
# Customers-Management
