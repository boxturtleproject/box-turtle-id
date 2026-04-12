from fastapi import APIRouter

from app.api import admin, compare, jobs, settings, submissions, sync, turtles

api_router = APIRouter(prefix="/api")

api_router.include_router(admin.router, tags=["admin"])
api_router.include_router(compare.router, tags=["compare"])
api_router.include_router(turtles.router, tags=["turtles"])
api_router.include_router(jobs.router, tags=["jobs"])
api_router.include_router(settings.router, tags=["settings"])
api_router.include_router(submissions.router, tags=["submissions"])
api_router.include_router(sync.router, tags=["sync"])
