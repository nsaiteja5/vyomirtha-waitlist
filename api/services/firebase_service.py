"""
Firebase Realtime Database service.
Thin async wrapper around the REST API.
"""
import httpx
from config import settings


def _get_database_url() -> str:
    return settings.FIREBASE_DATABASE_URL


def _url(path: str) -> str:
    return f"{_get_database_url()}/{path}.json"


async def get(path: str):
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(_url(path))
        if r.status_code not in (200, 201):
            print(f"[Firebase GET Error] {r.status_code}: {r.text}")
            r.raise_for_status()
        return r.json()


async def put(path: str, data):
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.put(_url(path), json=data)
        if r.status_code not in (200, 201):
            print(f"[Firebase PUT Error] {r.status_code}: {r.text}")
            r.raise_for_status()
        return r.json()


async def patch(path: str, data):
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.patch(_url(path), json=data)
        if r.status_code not in (200, 201):
            print(f"[Firebase PATCH Error] {r.status_code}: {r.text}")
            r.raise_for_status()
        return r.json()


async def post(path: str, data):
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(_url(path), json=data)
        if r.status_code not in (200, 201):
            print(f"[Firebase POST Error] {r.status_code}: {r.text}")
            r.raise_for_status()
        return r.json()


async def delete(path: str):
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.delete(_url(path))
        if r.status_code not in (200, 201):
            print(f"[Firebase DELETE Error] {r.status_code}: {r.text}")
            r.raise_for_status()
        return r.json()

