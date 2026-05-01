"""Thin HTTP wrapper around the Airtable REST API."""
import logging
import time
from typing import Iterator, Optional

import requests

from app.config import settings

logger = logging.getLogger(__name__)

API_ROOT = "https://api.airtable.com/v0"
CONTENT_ROOT = "https://content.airtable.com/v0"


class AirtableClient:
    def __init__(self, token: Optional[str] = None, base_id: Optional[str] = None,
                 dry_run: bool = False):
        self.token = token or settings.airtable_token
        self.base_id = base_id or settings.airtable_base_id
        self.dry_run = dry_run
        if not self.token or not self.base_id:
            raise RuntimeError("AIRTABLE_TOKEN and AIRTABLE_BASE_ID must be set")

    @property
    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}

    def _table_url(self, table: str) -> str:
        return f"{API_ROOT}/{self.base_id}/{table}"

    def _request(self, method: str, url: str, **kw) -> requests.Response:
        for attempt in range(5):
            resp = requests.request(method, url, headers=self._headers, timeout=30, **kw)
            if resp.status_code == 429:
                wait = 2 ** attempt
                logger.warning(f"429 from Airtable, sleeping {wait}s")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp
        raise RuntimeError("Airtable rate-limited after 5 retries")

    def iter_records(self, table: str, modified_since: Optional[str] = None,
                     fields: Optional[list[str]] = None) -> Iterator[dict]:
        params: dict = {"pageSize": 100}
        if modified_since:
            params["filterByFormula"] = f"IS_AFTER(LAST_MODIFIED_TIME(), '{modified_since}')"
        if fields:
            for f in fields:
                params.setdefault("fields[]", []).append(f)
        offset: Optional[str] = None
        while True:
            if offset:
                params["offset"] = offset
            resp = self._request("GET", self._table_url(table), params=params)
            data = resp.json()
            for rec in data.get("records", []):
                yield rec
            offset = data.get("offset")
            if not offset:
                break

    def create_record(self, table: str, fields: dict) -> Optional[dict]:
        if self.dry_run:
            logger.info(f"[dry-run] CREATE {table} fields={list(fields.keys())}")
            return None
        resp = self._request("POST", self._table_url(table), json={"fields": fields})
        return resp.json()

    def upload_attachment(self, record_id: str, field_name: str,
                          filename: str, content_type: str, file_bytes: bytes) -> Optional[dict]:
        """Upload a file attachment using the v0 content endpoint."""
        if self.dry_run:
            logger.info(f"[dry-run] UPLOAD {filename} -> {record_id}.{field_name}")
            return None
        import base64
        url = f"{CONTENT_ROOT}/{self.base_id}/{record_id}/{field_name}/uploadAttachment"
        body = {
            "contentType": content_type,
            "filename": filename,
            "file": base64.b64encode(file_bytes).decode(),
        }
        resp = self._request("POST", url, json=body)
        return resp.json()
