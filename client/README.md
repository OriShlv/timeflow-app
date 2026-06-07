# Client

React + Vite + TypeScript frontend for TimeFlow.

## Implemented app structure

- **Auth routes**: `/login`, `/register`
- **Protected app routes**: `/today`, `/tasks`, `/insights`, `/profile`
- **Layout**: app shell with bottom tab navigation and active focus-session controls
- **Core UX flows**:
  - Today view with urgent tasks and one-tap actions
  - Task management with search/filter/sort and CRUD modals
  - Insights dashboard with recommendations, trends, and freshness indicators
  - Profile view with user identity and timezone

## Run locally

```bash
bun install
bun run dev
```

Default local URL: `http://localhost:5173`.

## Build

```bash
bun run build
```

## Test

```bash
bun run test
```

## API dependency

The client expects the server API and authentication endpoints to be available. Configure API base URL/environment values as required for your local setup.
