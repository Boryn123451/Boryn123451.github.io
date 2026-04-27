from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router


app = FastAPI(
    title="Scientific CAS Calculator",
    version="1.0.0",
    description="Backend CAS z trybem symbolicznym, analiza, algebra i wykresami.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
assets_path = frontend_dist / "assets"

if assets_path.exists():
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")


@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    if not frontend_dist.exists():
        return {
            "message": "Frontend nie jest jeszcze zbudowany. Uruchom run.ps1 albo npm run build w frontend/."
        }

    requested = frontend_dist / full_path
    if full_path and requested.exists() and requested.is_file():
        return FileResponse(requested)

    return FileResponse(frontend_dist / "index.html")
