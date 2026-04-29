from src.database.session import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("DELETE FROM alembic_version"))
    conn.commit()