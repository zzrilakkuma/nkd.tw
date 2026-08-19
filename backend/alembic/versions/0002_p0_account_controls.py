"""P0 account controls on users

Revision ID: 0002_p0_account_controls
Revises: 0001_baseline
Create Date: 2026-08-18

新增帳號管控欄位：must_change_password / is_active / 公司聯絡資料。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_p0_account_controls"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(
            sa.Column(
                "must_change_password",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
        batch.add_column(
            sa.Column(
                "is_active",
                sa.Boolean(),
                nullable=False,
                server_default=sa.true(),
            )
        )
        batch.add_column(sa.Column("company_name", sa.String(), nullable=True))
        batch.add_column(sa.Column("contact_name", sa.String(), nullable=True))
        batch.add_column(sa.Column("contact_phone", sa.String(), nullable=True))
        batch.add_column(sa.Column("tax_id", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.drop_column("tax_id")
        batch.drop_column("contact_phone")
        batch.drop_column("contact_name")
        batch.drop_column("company_name")
        batch.drop_column("is_active")
        batch.drop_column("must_change_password")
