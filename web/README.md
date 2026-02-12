# Space Clone

Clone any space into a navigable 3D world in minutes.

Mobile-first PWA: capture 16 photos around you, stitch them into a 360° panorama, and generate an immersive 3D world via [World Labs API](https://docs.worldlabs.ai).

## Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **PWA**: Serwist (service worker, offline support)
- **Backend**: Supabase (Auth, PostgreSQL, Storage)
- **3D Generation**: World Labs Marble v1 API
- **Panorama Stitching**: Python microservice (Hugin + OpenCV)
- **Deploy**: Railway

## Setup

```bash
cd web
cp .env.example .env.local
# Fill in your credentials
npm install
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `WORLDLABS_API_KEY` | World Labs API key |
| `STITCH_SERVICE_URL` | Python stitch service URL |
| `NEXT_PUBLIC_APP_URL` | Public app URL |

### Supabase Setup

Apply the database schema:

```bash
# Via Supabase CLI
supabase db push

# Or manually run supabase/schema.sql in the SQL editor
```

Create storage buckets: `photos`, `panoramas`, `thumbnails`.

### Stitch Service

```bash
cd stitch-service
docker build -t space-clone-stitch .
docker run -p 8000:8000 space-clone-stitch
```

## Architecture

```
User → 16 Photos → /api/upload → Supabase Storage
                  → /api/stitch → Python Service → Equirectangular JPEG
                  → /api/generate → World Labs API → 3D World
                  → /world/[id] → Viewer iframe
                  → /share/[slug] → Public link + OG tags
```

Two Railway services:
- `space-clone-web` — Next.js app
- `space-clone-stitch` — Python/FastAPI panorama stitching

## Scripts

```bash
npm run dev       # Development server (Turbopack)
npm run build     # Production build (Webpack, for Serwist)
npm run start     # Start production server
npm run lint      # ESLint
```
