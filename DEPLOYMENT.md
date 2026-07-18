# Deployment Guide (Team Review URLs)

This guide creates a stable review setup using:
- Frontend: Vercel (free)
- Backend API: Render (free)
- Database: Neon Postgres (free)

## 1) Create a Neon Postgres database
1. Create a free Neon project.
2. Copy the connection string.
3. Ensure SQLAlchemy driver format is used:
   - postgresql+psycopg://USER:PASSWORD@HOST/DB?sslmode=require

## 2) Deploy backend to Render
Option A (recommended): Blueprint deploy from render.yaml.
1. In Render, choose New + Blueprint.
2. Select this repository.
3. Render will read render.yaml at repository root.
4. Set required env vars before first deploy:
   - DATABASE_URL: Neon URL in SQLAlchemy format
   - CORS_ALLOW_ORIGINS: include your Vercel URL, for example https://your-app.vercel.app
5. Deploy.

Option B: Manual Web Service.
- Root directory: backend
- Build command: pip install -r requirements.txt
- Start command: alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
- Health check: /health

## 3) Deploy frontend to Vercel
1. Import the same repository into Vercel.
2. Set project root to frontend.
3. Add environment variable:
   - NEXT_PUBLIC_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api/v1
4. Deploy.

## 4) Final CORS update in Render
After Vercel deploy gives your final URL:
1. Update CORS_ALLOW_ORIGINS in Render to include:
   - https://YOUR-VERCEL-URL
   - http://localhost:3000
   - http://127.0.0.1:3000
2. Redeploy backend.

## 5) Team review checklist
Share the Vercel URL and ask reviewers to validate:
1. Login/Register from API Auth bar.
2. Create a brief.
3. Generate a proposal.
4. Confirm proposal fields show:
   - Trace ID
   - Selected Model
   - Governance Flags
5. Review workflow and audit trail entries.

## Notes
- Render free tier sleeps when idle. First request may be slow.
- Local filesystem uploads are ephemeral on free web services. For persistent files, move uploads to object storage (R2/Supabase Storage).
- Keep ENABLE_CHROMA_RETRIEVAL=false for first deployment unless Chroma is also deployed.
