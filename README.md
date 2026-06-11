# World Cup 2026 Sweepstake

A Next.js app for running a World Cup 2026 sweepstake draw among friends. Each participant draws two random teams — one from a top-tier pot and one from a bottom-tier pot based on FIFA rankings.

## How it works

Given N participants in a group:
- **Top Tier Pot**: the N highest FIFA-ranked WC2026 nations
- **Bottom Tier Pot**: the next N highest FIFA-ranked nations
- Each participant selects their name from a whitelist and draws one team from each pot
- Teams are removed from the pool once drawn

Requires Node 22 (`.node-version` included for fnm/nvm).

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Edit `.env.local` with your MongoDB connection string, groups config, and admin PIN.

```bash
npm run dev
```

## URLs

| Path | Description |
|---|---|
| `/` | Landing page — logo + title |
| `/:group` | Group homepage — draw results + all teams table |
| `/:group/draw` | Draw flow — select name, spin wheel, reveal teams |
| `/admin` | Admin panel (PIN protected) — reset draws per group |

## Groups config

Groups (each with a name and participant name whitelist) are stored in the `GROUPS_CONFIG` environment variable as a JSON one-liner. To make editing easier:

1. Edit `.dronz/groups.json` (human-readable, gitignored)
2. Run `./scripts/groups-env.sh` — this minifies the JSON and copies the env var line to your clipboard
3. Paste into `.env.local`

### Example `.dronz/groups.json`

Compact array format: `[slug, displayName, [name, ...]]`

```json
[
  ["my-group", "My Group", [
    "Alice",
    "Bob"
  ]]
]
```

## Environment variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `GROUPS_CONFIG` | JSON array of group configs (see above) |
| `ADMIN_PIN` | 4-digit PIN for the `/admin` page |
