from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.base import Base
from app.db.models import Role, User
from app.db.session import engine, SessionLocal
from app.routers import audit, auth, briefs, documents, proposals, reviews


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_allow_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for role_name in ["sales_user", "reviewer", "admin"]:
            exists = db.query(Role).filter(Role.name == role_name).first()
            if not exists:
                db.add(Role(name=role_name, permissions={}))
        db.commit()

        admin_role = db.query(Role).filter(Role.name == "admin").first()
        admin_user = db.query(User).filter(User.email == "admin@suncarban.local").first()
        if not admin_user and admin_role:
            db.add(
                User(
                    email="admin@suncarban.local",
                    full_name="System Admin",
                    password_hash=get_password_hash("admin123"),
                    role_id=admin_role.id,
                )
            )
            db.commit()
    finally:
        db.close()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(briefs.router, prefix=settings.api_prefix)
app.include_router(documents.router, prefix=settings.api_prefix)
app.include_router(proposals.router, prefix=settings.api_prefix)
app.include_router(reviews.router, prefix=settings.api_prefix)
app.include_router(audit.router, prefix=settings.api_prefix)
