# OmniBiz Connect

A multi-vertical business management platform supporting **restaurant**, **hotel**, **pharmacy**, **retail**, and **property management** verticals with POS, AI insights, offline support, and multi-tenant architecture.

## Tech Stack

- **Frontend**: React 18, TypeScript (strict mode), Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, Postgres with RLS, Edge Functions)
- **Payments**: Paystack integration
- **AI**: OpenAI-powered copilot, demand forecasting, dynamic pricing, customer insights
- **PWA**: Service worker with offline POS via IndexedDB

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project (see [Supabase docs](https://supabase.com/docs))

### Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd omnibiz-connect
```

2. Install dependencies:

```bash
npm install
```

3. Create your environment file:

```bash
cp .env.example .env
```

4. Fill in your Supabase credentials in `.env`:

```
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
```

5. Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:8080`.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run build:dev` | Development mode build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## Project Structure

```
src/
  components/     # Reusable UI components (grouped by feature)
  contexts/       # React contexts (Auth, Language, Subscription)
  hooks/          # Custom hooks (permissions, offline, notifications)
  integrations/   # Supabase client and auto-generated types
  lib/            # Utility functions (currency, permissions, offline DB)
  pages/          # Route page components
  types/          # Core TypeScript interfaces

supabase/
  functions/      # Edge functions (AI, payments, notifications)
  migrations/     # Database migration files
```

## Business Verticals

- **Restaurant**: POS, kitchen display, table management, QR ordering, reservations
- **Hotel**: Room management, housekeeping, front desk, guest services, booking
- **Pharmacy**: Prescriptions, drug interactions, insurance billing, controlled substances
- **Retail**: POS, inventory, e-commerce, customer management
- **Property**: Unit management, leases, rent collection, tenant portal, maintenance

## Key Features

- **Multi-tenant**: Organization and location hierarchy with row-level security
- **Role-based access**: 6 roles with vertical-specific permission templates
- **Subscription tiers**: Starter, Professional, Enterprise with feature gating
- **Offline POS**: Process sales offline with automatic sync when online
- **AI Copilot**: Natural language business queries with real-time data
- **Multi-language**: 7 languages with RTL support
- **Public Portals**: Customer-facing pages for each vertical

## Testing

See [docs/TESTING.md](docs/TESTING.md) for comprehensive test users, credentials, and scenarios.

## Documentation

- [Testing Guide](docs/TESTING.md) - Test users and scenarios
- [User Manual](docs/USER_MANUAL.md) - End-user documentation
