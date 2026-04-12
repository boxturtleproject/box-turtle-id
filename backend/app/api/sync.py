from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.airtable import AirtableSyncService

router = APIRouter()


@router.post("/sync/airtable")
async def trigger_airtable_sync(db: Session = Depends(get_db)):
    service = AirtableSyncService(db)
    if not service.enabled:
        return {
            "status": "skipped",
            "message": "Airtable credentials not configured",
        }

    result = await service.full_sync()
    return {
        "status": "completed",
        "result": result,
    }
