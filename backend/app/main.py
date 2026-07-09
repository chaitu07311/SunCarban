from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.base import Base
from app.db.models import AuditLog, ClientBrief, Proposal, Review, Role, User
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

        # ── Workflow sample data ────────────────────────────────────────────
        sales_user = db.query(User).filter(User.email == "sales@suncarban.local").first()
        reviewer_user = db.query(User).filter(User.email == "reviewer@suncarban.local").first()

        sample_briefs = [
            dict(crop_type="Cotton", geography="Maharashtra", season="Kharif", acreage=120,
                 number_of_farmers=45, soil_issues="Low organic carbon",
                 trial_objective="Increase yield and improve soil structure",
                 application_method="Soil drench", duration_days=90,
                 pricing_inputs={"target_price": 4000, "discount_percent": 5},
                 commercial_notes="Pilot with two FPO clusters"),
            dict(crop_type="Paddy", geography="Telangana", season="Rabi", acreage=80,
                 number_of_farmers=28, soil_issues="Poor moisture retention",
                 trial_objective="Improve water efficiency and tiller count",
                 application_method="Soil drench", duration_days=75,
                 pricing_inputs={"target_price": 3500, "discount_percent": 10},
                 commercial_notes="Single FPO with 3 village clusters"),
            dict(crop_type="Maize", geography="Karnataka", season="Kharif", acreage=60,
                 number_of_farmers=22, soil_issues="Low nutrient availability",
                 trial_objective="Validate yield uplift and stand uniformity",
                 application_method="Foliar spray", duration_days=60,
                 pricing_inputs={"target_price": 4200, "discount_percent": 7},
                 commercial_notes="Comparison case for maize package"),
            dict(crop_type="Soybean", geography="Madhya Pradesh", season="Kharif", acreage=95,
                 number_of_farmers=34, soil_issues="Compacted soil and poor infiltration",
                 trial_objective="Improve root development and moisture retention",
                 application_method="Soil drench", duration_days=85,
                 pricing_inputs={"target_price": 3800, "discount_percent": 8},
                 commercial_notes="Check compatibility with existing crop inputs"),
            dict(crop_type="Horticulture", geography="Gujarat", season="Summer", acreage=40,
                 number_of_farmers=18, soil_issues="Salinity and uneven moisture",
                 trial_objective="Improve root zone health and fruit set",
                 application_method="Foliar spray", duration_days=100,
                 pricing_inputs={"target_price": 5000, "discount_percent": 6},
                 commercial_notes="High-value crop; validate ROI carefully"),
        ]

        created_brief_ids = []
        if sales_user and db.query(ClientBrief).count() == 0:
            for b in sample_briefs:
                brief = ClientBrief(created_by=sales_user.id, status="ready", **b)
                db.add(brief)
                db.flush()  # get id before commit
                db.add(AuditLog(actor_id=sales_user.id, action="brief_created",
                                entity_type="brief", entity_id=brief.id,
                                payload={"crop_type": b["crop_type"]}))
                created_brief_ids.append(brief.id)
            db.commit()

        all_brief_ids = created_brief_ids or [
            row.id for row in db.query(ClientBrief.id).all()
        ]

        sample_proposals = [
            dict(content="Proposal: Cotton trial in Maharashtra. Apply SunCarbon Black at 4 kg/acre via soil drench pre-sowing. Expected yield uplift: 10-15%.",
                 citations=[{"source": "application_guidelines_v1", "section": "2.1"}],
                 governance_flags=[], status="approved"),
            dict(content="Proposal: Paddy trial in Telangana. Apply at transplanting stage. Monitor tiller count at 30 DAS.",
                 citations=[{"source": "agronomy_trial_design_v1", "section": "3.0"}],
                 governance_flags=["Confirm irrigation schedule before application"], status="rejected"),
            dict(content="Proposal: Maize trial in Karnataka. Foliar application at 4-leaf stage. Compare with untreated control.",
                 citations=[{"source": "application_guidelines_v1", "section": "3.1"}],
                 governance_flags=[], status="approved"),
            dict(content="Proposal: Soybean trial in Madhya Pradesh. Soil drench at sowing. Target SOC improvement measurable at harvest.",
                 citations=[{"source": "fpo_pricing_reference_v1", "section": "5.0"}],
                 governance_flags=["Low SOC baseline; monitor carefully"], status="approved"),
            dict(content="Proposal: Horticulture trial in Gujarat. Foliar spray every 15 days during fruiting. ROI benchmark: INR 3500 per acre.",
                 citations=[{"source": "fpo_pricing_reference_v1", "section": "3.0"}],
                 governance_flags=["High-value crop: additional quality check required"], status="pending_review"),
        ]

        created_proposal_ids = []
        if db.query(Proposal).count() == 0:
            for brief_id, p in zip(all_brief_ids, sample_proposals):
                prop = Proposal(brief_id=brief_id, **p)
                db.add(prop)
                db.flush()
                if sales_user:
                    db.add(AuditLog(actor_id=sales_user.id, action="proposal_generated",
                                    entity_type="proposal", entity_id=prop.id, payload={}))
                created_proposal_ids.append(prop.id)
            db.commit()

        all_proposal_ids = created_proposal_ids or [
            row.id for row in db.query(Proposal.id).all()
        ]

        sample_reviews = [
            dict(decision="approved", comments="Commercial assumptions are reasonable. Proceed to pilot."),
            dict(decision="rejected", comments="Need clearer dosage guidance and field protocol before approval."),
            dict(decision="approved", comments="Citations are sufficient and governance checks are acceptable."),
            dict(decision="approved", comments="Good structure. Include farmer-wise implementation notes in final draft."),
            dict(decision="rejected", comments="ROI assumptions need more evidence for horticulture rollout."),
        ]

        if reviewer_user and db.query(Review).count() == 0:
            for proposal_id, r in zip(all_proposal_ids, sample_reviews):
                review = Review(proposal_id=proposal_id, reviewer_id=reviewer_user.id, **r)
                db.add(review)
                db.flush()
                db.add(AuditLog(actor_id=reviewer_user.id, action="review_submitted",
                                entity_type="proposal", entity_id=proposal_id,
                                payload={"decision": r["decision"]}))
            db.commit()
        # ── end workflow sample data ─────────────────────────────────────
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
