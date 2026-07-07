from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, boxes, imports, inventory, projects, scan, users

settings = get_settings()
app = FastAPI(title=settings.app_name, version="4.0.0")

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(imports.router)
app.include_router(projects.router)
app.include_router(boxes.router)
app.include_router(boxes.public_router)
app.include_router(scan.router)
app.include_router(inventory.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name, "version": "4.0.0"}
