"""add proposal observability fields

Revision ID: 20260718_01
Revises: 
Create Date: 2026-07-18 06:10:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260718_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("proposals") as batch_op:
        batch_op.add_column(sa.Column("trace_id", sa.String(length=80), nullable=False, server_default=""))
        batch_op.add_column(sa.Column("model_route", sa.JSON(), nullable=False, server_default="{}"))



def downgrade() -> None:
    with op.batch_alter_table("proposals") as batch_op:
        batch_op.drop_column("model_route")
        batch_op.drop_column("trace_id")
