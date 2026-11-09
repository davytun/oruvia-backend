# Oruvia Backend

**Oruvia: Your path to a roof.**

Oruvia is a Proptech and Real Estate Marketplace built for the Ogun Digital Summit Hackathon, connecting property seekers with verified landlords and real estate agents across Nigeria.

## Documentation

- [Product Requirements](docs/requirements.md) — Core features, business rules, and MVP scope
- [User Roles & Permissions](docs/roles.md) — Separate role tables (`seekers`, `agents`, `landlords`, `admins`) and permission rules
- [Developer Architecture Guide](docs/architecture.md) — Tech stack, folder structure, response conventions, and local setup
- [API Reference](docs/api.md) — Request and response documentation for all endpoints

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure local environment secrets
cp .dev.vars.example .dev.vars

# 3. Apply local D1 database migrations
npm run db:migrate:local

# 4. Run development server
npm run dev
```

## Useful Scripts

```bash
npm run typecheck         # Type-check with TypeScript
npm run cf-typegen        # Generate Cloudflare Worker binding types
npm run db:generate       # Generate Drizzle SQL migrations
npm run db:migrate:local  # Apply D1 migrations locally
npm run db:migrate:remote # Apply D1 migrations to remote D1
npm run deploy            # Deploy Worker to Cloudflare
```
