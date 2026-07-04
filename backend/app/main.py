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

        seed_accounts = [
            {
                "email": "sales@suncarban.local",
                "full_name": "System Sales",
                "password": "sales123",
                "role": "sales_user",
            },
            {
                "email": "reviewer@suncarban.local",
                "full_name": "System Reviewer",
                "password": "reviewer123",
                "role": "reviewer",
            },
            {
                "email": "admin@suncarban.local",
                "full_name": "System Admin",
                "password": "admin123",
                "role": "admin",
            },
        ]

        for account in seed_accounts:
            role = db.query(Role).filter(Role.name == account["role"]).first()
            user = db.query(User).filter(User.email == account["email"]).first()
            if not user and role:
                db.add(
                    User(
                        email=account["email"],
                        full_name=account["full_name"],
                        password_hash=get_password_hash(account["password"]),
                        role_id=role.id,
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
