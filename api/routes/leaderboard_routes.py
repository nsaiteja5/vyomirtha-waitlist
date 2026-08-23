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


async def recalculate_and_store_board():
    """
    Fetches all users from Firebase, sorts by balance descending,
    writes updated position to every user in Firebase, and updates leaderboard/stats.
    """
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
                "phone": data.get("phone", ""),
                "balance": balance,
                "paymentCount": data.get("paymentCount", 1),
                "lastPaidAmount": float(data.get("lastPaidAmount", balance)),
                "lastPaidAt": data.get("lastPaidAt", ""),
                "createdAt": data.get("createdAt", ""),
                "updatedAt": data.get("updatedAt", ""),
            }
        )

    # Sort descending by balance, with earlier lastPaidAt as tie breaker
    entries.sort(key=lambda x: (-x["balance"], x.get("lastPaidAt", "")))

    for i, entry in enumerate(entries):
        pos = i + 1
        entry["position"] = pos
        try:
            await db.patch(f"leaderboard/users/{entry['id']}", {"position": pos})
        except Exception as e:
            print(f"[Firebase Warning] Failed to update user position: {e}")

    top_entry = entries[0] if entries else None
    stats = {
        "topBid": top_entry["balance"] if top_entry else 0,
        "topBuilderId": top_entry["id"] if top_entry else "",
        "topBuilderName": top_entry["name"] if top_entry else "",
        "topBuilderHandle": top_entry["handle"] if top_entry else "",
        "totalBuilders": len(entries),
        "totalSecured": sum(e["balance"] for e in entries),
        "minBid": 1,
        "lastUpdated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    try:
        await db.patch("leaderboard/stats", stats)
    except Exception as e:
        print(f"[Firebase Warning] Failed to update stats: {e}")

    return entries, stats


@router.get("/")
async def get_leaderboard():
    """Return sorted leaderboard with computed positions and rich builder data."""
    entries, stats = await recalculate_and_store_board()
    return JSONResponse({"leaderboard": entries, "total": len(entries), "stats": stats})


@router.get("/config")
async def get_config():
    """Return leaderboard configuration and dynamic stats."""
    config = await db.get("leaderboard/config") or {}
    stats = await db.get("leaderboard/stats") or {}
    return JSONResponse(
        {
            "showDemoProfiles": config.get("showDemoProfiles", True),
            "minBid": 1,
            "topBid": stats.get("topBid", 0),
            "totalBuilders": stats.get("totalBuilders", 0),
            "totalSecured": stats.get("totalSecured", 0),
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
    Body: { name, state, language, bio, motto, projects, achievement, flex, title, links, phone }
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
        "flex",
        "title",
        "links",
        "phone",
    }
    updates = {k: v for k, v in body.items() if k in allowed_fields}
    updates["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if user.get("handle"):
        updates["handle"] = user["handle"]
    if user.get("avatar") and "avatar" not in updates:
        updates["avatar"] = user["avatar"]

    await db.patch(f"leaderboard/users/{user_id}", updates)
    return JSONResponse({"status": "updated", "profile": updates})


@router.get("/user/{user_id}")
async def get_user(user_id: str):
    """Get a specific user's complete profile."""
    data = await db.get(f"leaderboard/users/{user_id}")
    if not data or not isinstance(data, dict):
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
            "phone": data.get("phone", ""),
            "balance": float(data.get("balance", 0)),
            "position": data.get("position", None),
            "paymentCount": data.get("paymentCount", 0),
            "lastPaidAmount": data.get("lastPaidAmount", 0),
            "lastPaidAt": data.get("lastPaidAt", ""),
            "createdAt": data.get("createdAt", ""),
            "updatedAt": data.get("updatedAt", ""),
        }
    )

