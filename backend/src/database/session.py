from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.config.settings import settings

engine = create_engine(
    settings.DATABASE_URL,
    # pool_pre_ping=True is recommended for long-lived connections like Neon
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
