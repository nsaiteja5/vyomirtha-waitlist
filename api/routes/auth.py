"""
X (Twitter) OAuth 2.0 PKCE authentication routes.
Handles login flow and JWT session creation.
"""
import os
import base64
import hashlib
import secrets
import time

import httpx
import jwt
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse, JSONResponse
from config import settings
from services import firebase_service as db

router = APIRouter()

# In-memory PKCE store (per-process). Acceptable for single-instance deploys.
_pkce_store: dict[str, str] = {}


def get_env_config():
    """Return current config values from central settings."""
    return {
        "X_CLIENT_ID": settings.X_CLIENT_ID,
        "X_CLIENT_SECRET": settings.X_CLIENT_SECRET,
        "APP_URL": settings.APP_URL,
        "JWT_SECRET": settings.JWT_SECRET,
        "TEST_ENV": settings.TEST_ENV,
    }


@router.get("/x")
async def x_login():
    """Redirect user to X authorization page (or simulate login if TEST_ENV is true)."""
    cfg = get_env_config()
    app_url = cfg["APP_URL"]
    jwt_secret = cfg["JWT_SECRET"]

    # TEST_ENV simulation
    if cfg["TEST_ENV"]:
        print("[X Auth Test Mode] Simulating login with fake X profile...")
        x_id = "test_user_saiteja"
        name = "Sai Teja"
        handle = "SaiTejaNmglya"
        avatar = "/me.jpg"
        bio = "Building usefull softwares."

        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        existing = await db.get(f"leaderboard/users/{x_id}")

        profile_data = {
            "name": name,
            "handle": handle,
            "avatar": avatar,
            "updatedAt": now,
        }
        if not existing:
            profile_data["bio"] = bio
            profile_data["title"] = "Founder & Developer"
            profile_data["flex"] = "Test Mode Active"
            profile_data["links"] = {}
            profile_data["balance"] = 0
            profile_data["createdAt"] = now

        await db.patch(f"leaderboard/users/{x_id}", profile_data)

        token = jwt.encode(
            {
                "sub": x_id,
                "name": name,
                "handle": handle,
                "avatar": avatar,
                "exp": int(time.time()) + 86400 * 30,
            },
            jwt_secret,
            algorithm="HS256",
        )

        return RedirectResponse(f"{app_url}/leaderboard?xtoken={token}")

    client_id = cfg["X_CLIENT_ID"]
    if not client_id:
        print("[X Auth Warning] X_CLIENT_ID is not configured in .env file!")

    code_verifier = secrets.token_urlsafe(64)
    state = secrets.token_urlsafe(32)
    _pkce_store[state] = code_verifier

    code_challenge = (
        base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        )
        .rstrip(b"=")
        .decode()
    )

    redirect_uri = f"{app_url}/api/auth/x/callback"
    print(f"[X Auth] Initiating OAuth 2.0 flow: redirect_uri={redirect_uri}, client_id={client_id[:8]}***")
    params = (
        f"response_type=code"
        f"&client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=tweet.read%20users.read"
        f"&state={state}"
        f"&code_challenge={code_challenge}"
        f"&code_challenge_method=S256"
    )
    return RedirectResponse(f"https://twitter.com/i/oauth2/authorize?{params}")


@router.get("/x/callback")
async def x_callback(code: str = "", state: str = "", error: str = ""):
    """Handle X OAuth callback, exchange code for tokens, create session."""
    cfg = get_env_config()
    client_id = cfg["X_CLIENT_ID"]
    client_secret = cfg["X_CLIENT_SECRET"]
    app_url = cfg["APP_URL"]
    jwt_secret = cfg["JWT_SECRET"]

    if error or not code:
        print(f"[X Auth Error] Callback received error from X or no code: error={error}")
        return RedirectResponse(
            f"{app_url}/leaderboard?auth_error={error or 'denied'}"
        )

    code_verifier = _pkce_store.pop(state, None)
    if not code_verifier:
        print("[X Auth Error] Invalid PKCE state or session expired.")
        return RedirectResponse(
            f"{app_url}/leaderboard?auth_error=invalid_state"
        )

    redirect_uri = f"{app_url}/api/auth/x/callback"

    # Exchange authorization code for access token
    post_data = {
        "code": code,
        "grant_type": "authorization_code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "code_verifier": code_verifier,
    }

    req_kwargs = {
        "data": post_data,
        "headers": {"Content-Type": "application/x-www-form-urlencoded"},
    }

    # If secret is present, include Basic Auth header (Confidential Client)
    if client_secret:
        req_kwargs["auth"] = (client_id, client_secret)

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://api.twitter.com/2/oauth2/token",
            **req_kwargs
        )

        if token_resp.status_code != 200:
            print(f"[X Auth Error] Token exchange failed ({token_resp.status_code}): {token_resp.text}")
            return RedirectResponse(
                f"{app_url}/leaderboard?auth_error=token_failed"
            )

        tokens = token_resp.json()
        access_token = tokens.get("access_token")
        if not access_token:
            print("[X Auth Error] No access token in response:", tokens)
            return RedirectResponse(
                f"{app_url}/leaderboard?auth_error=no_token"
            )

        # Fetch user profile from X
        user_resp = await client.get(
            "https://api.twitter.com/2/users/me"
            "?user.fields=profile_image_url,name,username,description",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if user_resp.status_code != 200:
            print(f"[X Auth Error] Fetching profile failed ({user_resp.status_code}): {user_resp.text}")
            return RedirectResponse(
                f"{app_url}/leaderboard?auth_error=profile_failed"
            )

        user_data = user_resp.json().get("data", {})

    x_id = user_data.get("id", "")
    name = user_data.get("name", "")
    handle = user_data.get("username", "")
    avatar = (
        user_data.get("profile_image_url", "")
        .replace("_normal", "_400x400")
    )
    bio = user_data.get("description", "")

    # Store / update user profile in Firebase
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    existing = await db.get(f"leaderboard/users/{x_id}")

    profile_data = {
        "name": name,
        "handle": handle,
        "avatar": avatar,
        "updatedAt": now,
    }
    if not existing:
        profile_data["bio"] = bio
        profile_data["title"] = ""
        profile_data["flex"] = ""
        profile_data["links"] = {}
        profile_data["balance"] = 0
        profile_data["createdAt"] = now

    await db.patch(f"leaderboard/users/{x_id}", profile_data)

    # Create JWT session token (30 days)
    token = jwt.encode(
        {
            "sub": x_id,
            "name": name,
            "handle": handle,
            "avatar": avatar,
            "exp": int(time.time()) + 86400 * 30,
        },
        jwt_secret,
        algorithm="HS256",
    )

    return RedirectResponse(f"{app_url}/leaderboard?xtoken={token}")


@router.get("/me")
async def get_current_user(request: Request):
    """Return the current authenticated user from JWT."""
    cfg = get_env_config()
    jwt_secret = cfg["JWT_SECRET"]
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return JSONResponse({"user": None})

    try:
        payload = jwt.decode(auth[7:], jwt_secret, algorithms=["HS256"])
        return JSONResponse(
            {
                "user": {
                    "id": payload.get("sub"),
                    "name": payload.get("name"),
                    "handle": payload.get("handle"),
                    "avatar": payload.get("avatar"),
                }
            }
        )
    except jwt.ExpiredSignatureError:
        return JSONResponse({"user": None, "error": "expired"})
    except jwt.InvalidTokenError:
        return JSONResponse({"user": None, "error": "invalid"})


def decode_token(request: Request) -> dict | None:
    """Utility to extract user from Authorization header."""
    cfg = get_env_config()
    jwt_secret = cfg["JWT_SECRET"]
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        return jwt.decode(auth[7:], jwt_secret, algorithms=["HS256"])
    except Exception as e:
        print(f"[JWT Decode Error] Failed to decode token: {e}")
        return None
