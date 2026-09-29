# Trigonum Trader Dashboard

Vite + React + TypeScript version of the Trigonum Trader Intelligence dashboard.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Data source

The frontend loads `public/data/dashboard.json`. This is intentional: the next step is a scheduled GitHub Action that regenerates this file from exchange APIs while API keys remain in GitHub Actions Secrets.

Never place exchange API keys in `src/`, `public/`, browser-exposed Vite variables, or committed files.

## GitHub Pages

The repository contains a GitHub Pages workflow. In repository settings, set **Pages → Source → GitHub Actions**.
