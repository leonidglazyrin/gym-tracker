# RepTrack

A simple, mobile-first gym workout tracker built with Next.js, TypeScript, Tailwind CSS, Recharts and Lucide.

## Included

- Fast set / reps / weight logging
- Add custom exercises
- Today workout view
- Progress chart and recent session history
- Lightweight profile screen
- Responsive mobile-first UI

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Next step

The UI is intentionally ready for a Supabase persistence layer. Connect Supabase Auth + Postgres and replace the local workout state with user-scoped workout/session/set records.
