## Development Setup

### Prereqs
- Node 18+
- pnpm or npm

### Install
```
pnpm i
```

### Web app
```
pnpm -w @flowpuppy/web dev
```

### E2E tests (prod build)
```
pnpm -w @flowpuppy/web build && pnpm -w @flowpuppy/web start -p 3001 &
pnpm -w @flowpuppy/web e2e
```

### Optional: local Supabase
Set env in `apps/web/.env.local` and run migrations under `/supabase/migrations`.


