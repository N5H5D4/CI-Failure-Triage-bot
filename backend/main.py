# backend/main.py
from controllers import webhook, dashboard, repo, settings
from database import engine, Base
from sqlalchemy import text
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv, find_dotenv

# Aggressively locate and load .env file
env_file = find_dotenv(usecwd=True)
if env_file:
    load_dotenv(env_file)
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(Path.cwd() / ".env")


# Automatically create all database tables in SQLite/PostgreSQL
Base.metadata.create_all(bind=engine)

# Ensure is_simulated column exists in case triage.db already exists
try:
    with engine.connect() as conn:
        conn.execute(
            text("ALTER TABLE triage_results ADD COLUMN is_simulated BOOLEAN DEFAULT 0"))
        conn.commit()
except Exception:
    pass  # Column already exists or table freshly created

app = FastAPI(
    title="CI Failure Triage Bot API",
    description="Automated AI Triage Service for GitHub Actions CI logs using Anthropic Claude & Clean Architecture",
    version="1.0.0"
)

# CORS middleware for React / Vite Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Controller Routers
app.include_router(webhook.router)
app.include_router(webhook.router, prefix="/api")
app.include_router(dashboard.router)
app.include_router(repo.router)
app.include_router(settings.router)


@app.get("/")
def read_root():
    return {
        "service": "CI Failure Triage Bot",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "webhook": "/webhook",
            "dashboard_results": "/api/triage-results",
            "metrics": "/api/metrics",
            "repos": "/api/repos",
            "settings": "/api/settings"
        }
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
