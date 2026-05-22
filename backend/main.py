import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger("prepai")

# Load environment variables
load_dotenv()

from database import Base, engine
import models
from routes import upload, doubt, summarize, quiz, chat, analytics, notifications, search

# Automatically create all SQL database tables in SQLite/PostgreSQL upon startup
Base.metadata.create_all(bind=engine)

# Initialize slowapi rate limiter
limiter = Limiter(key_func=get_remote_address)

# Initialize FastAPI app
app = FastAPI(
    title="PrepAI Backend",
    description="API for the PrepAI Study Platform",
    version="1.0.0"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS (allowing the frontend to communicate with the backend)
allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "")
if allowed_origins_env:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    allowed_origins = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]

logger.info(f"CORS origins configured: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(upload.router)
app.include_router(doubt.router)
app.include_router(summarize.router)
app.include_router(quiz.router)
app.include_router(chat.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(search.router)

@app.get("/")
async def root():
    return {"status": "healthy", "message": "Welcome to the PrepAI Backend API"}

if __name__ == "__main__":
    import uvicorn
    # Run the server on port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
