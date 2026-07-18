# SunCarbon Black Crop Trial / FPO Proposal Co-Pilot (MVP)

Open-source MVP for generating crop/FPO trial proposals with multi-agent orchestration, retrieval grounding, governance checks, and human review.

## Stack
- Frontend: Next.js 15, TypeScript, Tailwind CSS
- Backend: FastAPI, Python 3.12, SQLAlchemy
- AI: LangGraph/LangChain agent workflow (starter implementation)
- RAG: ChromaDB + sentence-transformers (dependencies wired)
- DB: PostgreSQL (Docker) or SQLite (local fallback)
- Auth: JWT

## Project Layout
- `backend/` FastAPI APIs, models, agent workflow skeleton, tests
- `frontend/` Next.js app with all requested screens
- `samples/` sample briefs and knowledge docs
- `docker-compose.yml` local multi-service startup

## Quick Start (Backend only)
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-ai.txt  # optional, for full local RAG/agent integrations
alembic upgrade head
pytest -q
uvicorn app.main:app --reload --port 8000
```

## Quick Start (Full stack with Docker)
```bash
docker compose up --build
```

## Frontend API Setup
Create `frontend/.env.local` with:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

Then run frontend:
```bash
cd frontend
npm install
npm run dev
```

The UI pages include an `API Auth` bar for quick login/register using the MVP JWT endpoints.

## Default Admin
- Email: `admin@suncarban.local`
- Password: `admin123`

## API Endpoints (MVP)
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/briefs`
- `PUT /api/v1/briefs/{brief_id}`
- `GET /api/v1/briefs`
- `GET /api/v1/briefs/{brief_id}/validation`
- `POST /api/v1/documents/{brief_id}`
- `GET /api/v1/documents/brief/{brief_id}`
- `POST /api/v1/documents/{document_id}/reindex`
- `GET /api/v1/documents/indexing/summary`
	- Optional query params: `brief_id`, `since_days`
- `POST /api/v1/proposals`
- `GET /api/v1/proposals`
- `GET /api/v1/proposals/{proposal_id}`
- `GET /api/v1/proposals/{proposal_id}/citations`
- `POST /api/v1/reviews`
- `GET /api/v1/reviews/proposal/{proposal_id}`
- `GET /api/v1/audit-logs`

## Notes
- Current implementation provides the architecture-aligned starter with working API flow and screen scaffolding.
- Agent workflow now includes node-based orchestration (Analyzer -> Retriever -> Drafter -> Governance).
- Database schema changes should be applied with `alembic upgrade head` from [backend/alembic.ini](/d:/Projects/SunCarban/backend/alembic.ini).
- Optional runtime toggles:
	- `ENABLE_LANGGRAPH=true` to run graph execution using LangGraph.
	- `ENABLE_CHROMA_RETRIEVAL=true` to use Chroma retrieval path (requires indexed collection).
	- `ENABLE_LANGFUSE=true` to emit workflow trace and node spans (requires `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, optional `LANGFUSE_HOST`).
	- `ROUTE_MODEL_ROUTER_ENABLED=true` to enable heuristic model selection metadata.
	- `ROUTE_MODEL_CASCADE_ENABLED=true` to allow escalation from lite to strong route when confidence is low or governance flags appear.
	- Route thresholds: `ROUTE_MODEL_COMPLEXITY_THRESHOLD` and `ROUTE_MODEL_CONFIDENCE_THRESHOLD`.
	- If optional AI dependencies are not installed, the workflow safely falls back to deterministic local logic.

## Team Review Deployment
- Stable team review setup docs are in `DEPLOYMENT.md`.
- Backend blueprint for Render is in `render.yaml`.
- Recommended stack:
	- Frontend: Vercel
	- Backend: Render
	- Database: Neon Postgres
