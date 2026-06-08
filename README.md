# World Cup 2026 Sweepstake

A Next.js app for running a World Cup 2026 sweepstake draw among friends. Each participant draws two random teams — one from a top-tier pot and one from a bottom-tier pot based on FIFA rankings.

## How it works

Given N participants in a group:
- **Top Tier Pot**: the N highest FIFA-ranked WC2026 nations
- **Bottom Tier Pot**: the next N highest FIFA-ranked nations
- Each participant enters their phone number and draws one team from each pot
- Teams are removed from the pool once drawn

Requires Node 22 (`.node-version` included for fnm/nvm).

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Edit `.env.local` with your MongoDB connection string, groups config, and admin PIN (see below).

```bash
npm run dev
```

## URLs

| Path | Description |
|---|---|
| `/` | Landing page |
| `/:group` | Group homepage — draw results + all teams table |
| `/:group/draw` | Draw flow — enter phone number, get teams |
| `/admin` | Admin panel (PIN protected) — reset draws per group |

## Groups config

Groups (each with a name and phone number whitelist) are stored in the `GROUPS_CONFIG` environment variable as a JSON one-liner. To make editing easier:

1. Edit `.dronz/groups.json` (human-readable, gitignored)
2. Run `./scripts/groups-env.sh` — this minifies the JSON and copies the env var line to your clipboard
3. Paste into `.env.local`

### Example `.dronz/groups.json`

Compact array format: `[slug, displayName, [[phone, name], ...]]`

```json
[
  ["my-group", "My Group", [
    ["+447000000001", "Alice"],
    ["+447000000002", "Bob"]
  ]]
]
```

## Environment variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `GROUPS_CONFIG` | JSON array of group configs (see above) |
| `ADMIN_PIN` | 4-digit PIN for the `/admin` page |
