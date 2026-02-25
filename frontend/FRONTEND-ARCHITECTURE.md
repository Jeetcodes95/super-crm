# Frontend Architecture Blueprint: Super CRM

## Stack

- **Framework**: Next.js 14 (App Router, Server Components by default)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui component system
- **State**: Zustand (client) + TanStack Query (server state)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Tables**: TanStack Table

## Project Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Shell with sidebar + nav
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Role-based summary
│   │   ├── crm/
│   │   │   ├── leads/
│   │   │   │   ├── page.tsx    # Lead table + kanban
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx  # Lead detail
│   │   │   ├── deals/
│   │   │   └── pipeline/
│   │   ├── lms/
│   │   │   ├── courses/
│   │   │   ├── courses/[id]/
│   │   │   └── my-learning/
│   │   └── hrms/
│   │       ├── employees/
│   │       ├── attendance/
│   │       └── leaves/
│   ├── api/                    # API route handlers (Next.js)
│   └── layout.tsx              # Root layout + providers
├── components/
│   ├── ui/                     # shadcn/ui base components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── Breadcrumbs.tsx
│   ├── crm/
│   │   ├── LeadCard.tsx
│   │   ├── PipelineBoard.tsx
│   │   └── ScoreBadge.tsx
│   ├── lms/
│   │   ├── CourseCard.tsx
│   │   └── ProgressBar.tsx
│   └── hrms/
│       ├── EmployeeTable.tsx
│       └── AttendanceCalendar.tsx
├── lib/
│   ├── api/                    # Axios instance + API clients
│   ├── stores/                 # Zustand stores
│   ├── hooks/                  # Custom hooks
│   ├── utils/                  # Formatters, helpers
│   └── validations/            # Zod schemas
├── types/                      # Global TypeScript types
└── middleware.ts               # Auth + RBAC route protection
```

## Authentication Flow

```typescript
// middleware.ts — Next.js middleware for route protection
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from './lib/utils/jwt';

const PUBLIC_ROUTES = ['/', '/login', '/register'];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const isPublic = PUBLIC_ROUTES.includes(request.nextUrl.pathname);

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Role-based route protection
  if (token) {
    const payload = await verifyJWT(token);
    if (!canAccess(payload.role, request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL('/403', request.url));
    }
  }

  return NextResponse.next();
}
```

## Server State Management (TanStack Query)

```typescript
// lib/hooks/crm/useLeads.ts
export function useLeads(filters: LeadFilters) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => apiClient.leads.list(filters),
    staleTime: 30_000,    // 30s
    gcTime: 5 * 60_000,   // 5 min
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiClient.leads.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
```

## Role-Based Component Rendering

```typescript
// components/RoleGuard.tsx
export function RoleGuard({ roles, children, fallback }: RoleGuardProps) {
  const { user } = useAuthStore();
  if (!roles.includes(user.role)) return fallback ?? null;
  return children;
}

// Usage
<RoleGuard roles={['ORG_ADMIN', 'MANAGER']}>
  <CreateLeadButton />
</RoleGuard>
```
