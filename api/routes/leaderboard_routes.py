"""
Leaderboard data routes.
Profile updates and leaderboard queries.
"""
import time

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from services import firebase_service as db
from routes.auth import decode_token

router = APIRouter()


@router.get("/")
async def get_leaderboard():
    """Return sorted leaderboard with computed positions and rich builder data."""
    users = await db.get("leaderboard/users") or {}

    entries = []
    for uid, data in users.items():
        if not data or not isinstance(data, dict):
            continue
        balance = float(data.get("balance", 0))
        if balance <= 0:
            continue
        entries.append(
            {
                "id": uid,
                "name": data.get("name", ""),
                "handle": data.get("handle", ""),
                "avatar": data.get("avatar", ""),
                "state": data.get("state", ""),
                "language": data.get("language", ""),
                "bio": data.get("bio", ""),
                "motto": data.get("motto", ""),
                "projects": data.get("projects", []),
                "achievement": data.get("achievement", "") or data.get("flex", ""),
                "title": data.get("title", ""),
                "links": data.get("links", {}),
                "balance": balance,
                "lastPaidAt": data.get("lastPaidAt", ""),
            }
        )

    entries.sort(key=lambda x: -x["balance"])
    for i, entry in enumerate(entries):
        entry["position"] = i + 1

    return JSONResponse({"leaderboard": entries, "total": len(entries)})


@router.get("/config")
async def get_config():
    """Return leaderboard configuration."""
    config = await db.get("leaderboard/config")
    return JSONResponse(
        config
        or {
            "showDemoProfiles": True,
            "minBid": 10,
        }
    )


@router.get("/activity")
async def get_activity():
    """Return recent activity events (last 50)."""
    activity = await db.get("leaderboard/activity") or {}
    events = []
    for key, data in activity.items():
        if not data or not isinstance(data, dict):
            continue
        events.append({**data, "id": key})

    events.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return JSONResponse({"activity": events[:50]})


@router.put("/profile")
async def update_profile(request: Request):
    """
    Update the authenticated user's leaderboard profile.
    Body: { name, state, language, bio, motto, projects, achievement, title, links, phone }
    """
    user = decode_token(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    body = await request.json()
    user_id = user["sub"]

    allowed_fields = {
        "name",
        "state",
        "language",
        "bio",
        "motto",
        "projects",
        "achievement",
        "title",
        "links",
        "phone",
    }
    updates = {k: v for k, v in body.items() if k in allowed_fields}
    updates["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    await db.patch(f"leaderboard/users/{user_id}", updates)
    return JSONResponse({"status": "updated"})


@router.get("/user/{user_id}")
async def get_user(user_id: str):
    """Get a specific user's profile."""
    data = await db.get(f"leaderboard/users/{user_id}")
    if not data:
        return JSONResponse({"error": "User not found"}, status_code=404)
    return JSONResponse(
        {
            "id": user_id,
            "name": data.get("name", ""),
            "handle": data.get("handle", ""),
            "avatar": data.get("avatar", ""),
            "state": data.get("state", ""),
            "language": data.get("language", ""),
            "bio": data.get("bio", ""),
            "motto": data.get("motto", ""),
            "projects": data.get("projects", []),
            "achievement": data.get("achievement", "") or data.get("flex", ""),
            "title": data.get("title", ""),
            "links": data.get("links", {}),
            "balance": float(data.get("balance", 0)),
        }
    )

