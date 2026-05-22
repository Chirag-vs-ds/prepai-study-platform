import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Load environment variables at startup
load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()

if not DATABASE_URL:
    # Use SQLite for offline, zero-config local development
    DATABASE_URL = "sqlite:///./eduai.db"
    print("Database Config: DATABASE_URL not found. Defaulting to local SQLite fallback: eduai.db")
else:
    print(f"Database Config: Found DATABASE_URL: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")

# SQLite requires different thread-safety settings than PostgreSQL
is_sqlite = DATABASE_URL.startswith("sqlite")

# Create the SQLAlchemy connection engine
connect_args = {"check_same_thread": False} if is_sqlite else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Create SessionLocal which generates individual database transaction sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declare Base class which our database model classes will inherit from
class Base(DeclarativeBase):
    pass

# Dependency generator to share database sessions cleanly across requests
def get_db():
    """
    FastAPI dependency that opens a database connection session for a request, 
    and guarantees it is closed immediately after the request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
