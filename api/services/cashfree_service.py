"""
Cashfree Payment Gateway service.
Handles order creation and webhook signature verification.
"""
import os
import re
import hmac
import hashlib
import httpx
from config import settings


def get_cashfree_config() -> dict:
    """Return current Cashfree settings from central config."""
    return {
        "APP_ID": settings.CASHFREE_APP_ID,
        "SECRET_KEY": settings.CASHFREE_SECRET_KEY,
        "ENV": settings.CASHFREE_ENV,
        "BASE_URL": settings.CASHFREE_BASE_URL,
        "API_VERSION": settings.CASHFREE_API_VERSION,
    }


def _headers() -> dict:
    cfg = get_cashfree_config()
    return {
        "x-client-id": cfg["APP_ID"],
        "x-client-secret": cfg["SECRET_KEY"],
        "x-api-version": cfg["API_VERSION"],
        "Content-Type": "application/json",
    }


async def create_order(
    order_id: str,
    amount: float,
    customer_id: str,
    customer_name: str,
    customer_phone: str = "9999999999",
    return_url: str = "",
    notify_url: str = "",
) -> dict:
    """Create a Cashfree payment order and return response including payment_session_id."""
    cfg = get_cashfree_config()

    # Sanitize customer_id and customer_name to comply with Cashfree specs
    clean_id = re.sub(r"[^a-zA-Z0-9_-]", "_", customer_id)[:40] or "customer_1"
    clean_name = re.sub(r"[^\w\s]", "", customer_name).strip()[:50] or "Builder"
    clean_order_id = re.sub(r"[^a-zA-Z0-9_-]", "_", order_id)[:45]

    payload = {
        "order_id": clean_order_id,
        "order_amount": round(float(amount), 2),
        "order_currency": "INR",
        "customer_details": {
            "customer_id": clean_id,
            "customer_name": clean_name,
            "customer_phone": customer_phone if len(customer_phone) == 10 else "9999999999",
        },
        "order_meta": {
            "return_url": return_url,
            "notify_url": notify_url,
        },
    }

    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{cfg['BASE_URL']}/orders", headers=_headers(), json=payload
        )
        if r.status_code not in (200, 201):
            print(f"[Cashfree API Error] ({r.status_code}) Body: {r.text}")
            raise Exception(f"Cashfree API Error ({r.status_code}): {r.text}")
        return r.json()


async def get_order(order_id: str) -> dict:
    """Fetch order status from Cashfree."""
    cfg = get_cashfree_config()
    clean_order_id = re.sub(r"[^a-zA-Z0-9_-]", "_", order_id)[:45]
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{cfg['BASE_URL']}/orders/{clean_order_id}", headers=_headers()
        )
        if r.status_code != 200:
            print(f"[Cashfree Get Order Error] ({r.status_code}) Body: {r.text}")
            raise Exception(f"Cashfree API Error ({r.status_code}): {r.text}")
        return r.json()


def verify_webhook_signature(
    raw_body: bytes, timestamp: str, signature: str
) -> bool:
    """Verify Cashfree webhook signature using HMAC-SHA256."""
    cfg = get_cashfree_config()
    secret = cfg["SECRET_KEY"]
    message = timestamp.encode() + raw_body
    computed = hmac.new(
        secret.encode(), message, hashlib.sha256
    ).digest()
    import base64

    computed_b64 = base64.b64encode(computed).decode()
    return hmac.compare_digest(computed_b64, signature)

