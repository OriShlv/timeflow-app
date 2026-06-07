# Client

React + Vite + TypeScript SPA for TimeFlow. Mobile-first layout with bottom tab navigation.

← [Back to root README](../README.md)

## Table of contents

- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Routes](#routes)
- [Project structure](#project-structure)

## Tech stack

| Area | Choice |
|------|--------|
| UI | React 19, React Router 7 |
| Build | Vite 6, TypeScript 5.7 |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Tests | Vitest, Testing Library |

## Quick start

Requires the [server API](../server/README.md) running on the configured base URL.

```bash
cp .env.example .env
bun install
bun run dev
```

Open http://localhost:5173.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3000` | Server API base URL |

Defined in `.env`; read via `src/lib/env.ts`.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Vite dev server with HMR |
| `bun run build` | Type-check (`tsc -b`) + production bundle |
| `bun run preview` | Serve production build locally |
| `bun run test` | Run Vitest unit tests |

## Routes

| Path | Page | Auth |
|------|------|------|
| `/` | Redirect to `/today` or `/login` | — |
| `/login` | Login | Public (redirect if logged in) |
| `/register` | Register | Public (redirect if logged in) |
| `/dashboard` | Home — calendar, recommendations | Protected |
| `/today` | Today — urgent tasks, focus panel | Protected |
| `/tasks` | Task list, search, CRUD | Protected |
| `/insights` | Analytics dashboard | Protected |
| `/profile` | Profile — name, timezone settings, logout | Protected |

Protected routes render inside `AppShell` (tabs + active focus bar).

## Project structure

```
src/
├── pages/              # Route-level views
├── features/           # Domain UI (tasks, dashboard, home)
├── components/
│   ├── layout/         # AppShell
│   ├── focus/          # Focus session panel and bar
│   ├── planner/        # Planner agent popup
│   ├── routing/        # Auth guards
│   └── ui/             # Shared primitives (Button, Modal, Toast, …)
└── lib/
    ├── apiClient.ts    # Fetch wrapper
    ├── AuthContext.tsx # JWT session, profile refresh, settings save
    ├── i18n/           # Translation catalogs (English active; Hebrew deferred)
    ├── dateFormat.ts   # Timezone-aware date/time formatting
    ├── usersApi.ts     # GET /users/me, PATCH /users/me/settings
    ├── FocusSessionContext.tsx
    ├── PlannerAgentContext.tsx
    └── *Api.ts         # Per-domain API modules
```

Profile settings are loaded from `GET /users/me` on app start. The language field is stored on the server but UI locale switching is disabled (`UI_LOCALE_SWITCHING_ENABLED` in `src/lib/i18n/config.ts`) until Hebrew + RTL layout are complete.

## Key contexts

- **AuthContext** — JWT session, login/logout, `refreshUser`, `updateSettings`
- **I18nProvider** — UI strings via translation keys (English only for now)
- **FocusSessionContext** — active focus timer state
- **PlannerAgentContext** — planner agent session lifecycle

## Related docs

- [Root README — Quick start](../README.md#quick-start)
- [Server API](../server/README.md)
- [Analytics endpoints](../docs/ANALYTICS.md)
