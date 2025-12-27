# ZakOps Dashboard

World-class deal lifecycle management dashboard built with Next.js 15, shadcn/ui, and Tailwind CSS.

## Features

- **Dashboard**: Pipeline funnel with stage filters, deal table, action rail, quarantine inbox, alerts
- **Deals List**: Sortable/filterable table with search, stage and status filters
- **Deal Workspace**: Case file viewer, event history, stage transitions, pending actions
- **Actions**: Due/overdue/today/week/upcoming categorization with tabs
- **Quarantine**: Resolution flow (link to deal, create new, discard)

## API Integration

The dashboard uses **Next.js rewrites** to proxy all `/api/*` requests to the backend API server.
This ensures consistent behavior between development and production.

### Configuration

Set the `API_URL` environment variable to point to your backend API:

```bash
# Default: http://localhost:8090
API_URL=http://localhost:8090
```

### API Endpoints Used

| Endpoint | Description |
|----------|-------------|
| `/api/deals` | List deals (with filters) |
| `/api/deals/:id` | Get deal details |
| `/api/deals/:id/events` | Get deal events |
| `/api/deals/:id/case-file` | Get case file projection |
| `/api/deals/:id/transition` | Transition deal stage |
| `/api/deals/:id/note` | Add note to deal |
| `/api/deferred-actions` | List all actions |
| `/api/deferred-actions/due` | List due actions |
| `/api/quarantine` | List quarantine items |
| `/api/quarantine/health` | Get quarantine health |
| `/api/quarantine/:id/resolve` | Resolve quarantine item |
| `/api/alerts` | Get alerts |
| `/api/metrics/classification` | Get classification metrics |
| `/api/checkpoints` | Get active checkpoints |

## Development

### Prerequisites

- Node.js 18+ (tested with 20.x)
- npm 10+
- Backend API running on port 8090

### Quick Start

```bash
cd /home/zaks/zakops-dashboard

# Using Makefile (recommended)
make install    # Install dependencies
make dev        # Start dev server on port 3003
make test       # Run smoke tests (in another terminal)

# Or manually
npm install
npx next dev --port 3003
```

Then open http://localhost:3003

### Available Make Commands

| Command | Description |
|---------|-------------|
| `make install` | Install dependencies |
| `make dev` | Start development server (port 3003) |
| `make build` | Build for production |
| `make start` | Start production server |
| `make test` | Run smoke tests |
| `make lint` | Run linter |
| `make health` | Quick health check |
| `make clean` | Clean build artifacts |

### Environment Variables

Create a `.env.local` file (optional):

```bash
# Backend API URL (default: http://localhost:8090)
API_URL=http://localhost:8090
```

## Production

### Build

```bash
npm run build
```

### Start

```bash
npm run start
```

The production server runs on port 3001 by default.

### Deployment Options

1. **Same server as API**: Run Next.js on port 3001, API on port 8090
2. **Reverse proxy**: Use nginx to serve both on standard ports
3. **Docker**: Build a container with the Next.js app

## Project Structure

```
src/
├── app/
│   ├── dashboard/page.tsx    # Main dashboard
│   ├── deals/
│   │   ├── page.tsx          # Deals list
│   │   └── [id]/page.tsx     # Deal workspace
│   ├── actions/page.tsx      # Actions page
│   └── quarantine/page.tsx   # Quarantine inbox
├── components/
│   ├── layout/               # Sidebar, header, navigation
│   └── ui/                   # shadcn/ui components
├── config/
│   └── nav-config.ts         # Navigation configuration
└── lib/
    └── api.ts                # Centralized API client with Zod validation
```

## API Client

All API calls go through `src/lib/api.ts` which provides:

- **Zod validation**: Response shapes are validated and normalized
- **Error handling**: Consistent `ApiError` class with status codes
- **Array normalization**: Responses are always normalized to arrays where expected
  (prevents "filter is not a function" errors)

### Example Usage

```typescript
import { getDeals, getDeal, getActions } from '@/lib/api';

// Always returns Deal[] (never undefined)
const deals = await getDeals({ status: 'active' });

// Returns DealDetail | null
const deal = await getDeal('DEAL-2025-001');

// Always returns Action[] (never undefined)
const actions = await getActions({ deal_id: 'DEAL-2025-001' });
```

## Testing

### Smoke Test

Run the smoke test to verify all pages and API endpoints work:

```bash
# Start the dev server first
npx next dev --port 3003

# In another terminal, run the smoke test
./smoke-test.sh
```

The smoke test checks:
- All page routes return HTTP 200
- All API proxy endpoints work
- Filtered routes work correctly

### Manual Smoke Test Checklist

1. Load `/dashboard` → Pipeline counts render, no console errors
2. Click "View all" in Deals section → `/deals` loads
3. Use stage filter dropdown → No crash, filtering works
4. Click a deal row → `/deals/[id]` loads with Overview/Events tabs
5. Click "View all" in Quarantine → `/quarantine` loads
6. No red runtime error overlays anywhere

## Troubleshooting

### Common Issues

1. **Zod validation errors** - The API client handles string-to-number coercion automatically.
   Numeric fields like `asking_price` can be strings like "TBD" and will convert to `null`.

2. **Select component errors** - All Select components use non-empty sentinel values internally.
   Filter values are converted correctly when updating URLs.

3. **Deal not found** - Check the API is running on port 8090. The deal ID in the URL
   must match `deal_id` from the API response.

## Credits

Based on [Kiranism/next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter).
