from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.airtable import AirtableSync

router = APIRouter()


@router.post("/sync/airtable/pull")
async def pull(
    incremental: bool = Query(False),
    include_images: bool = Query(True),
    with_sift: bool = Query(True),
    db: Session = Depends(get_db),
):
    return AirtableSync(db).pull_all(
        incremental=incremental, with_images=include_images, with_sift=with_sift
    )


@router.post("/sync/airtable/push")
async def push(db: Session = Depends(get_db)):
    return AirtableSync(db).push_all()


@router.post("/sync/airtable")
async def full_sync(
    incremental: bool = Query(False),
    include_images: bool = Query(True),
    with_sift: bool = Query(True),
    db: Session = Depends(get_db),
):
    return AirtableSync(db).sync(
        incremental=incremental, with_images=include_images, with_sift=with_sift
    )
