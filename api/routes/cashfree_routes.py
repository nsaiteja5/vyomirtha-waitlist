"""
Cashfree payment routes.
Handles order creation for bids and webhook verification.
"""
import os
import time
import uuid

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from config import settings
from services import firebase_service as db
from services import cashfree_service as cashfree
from routes.auth import decode_token

# Lazy import to avoid circular dependency
async def _recalculate():
    from routes.leaderboard_routes import recalculate_and_store_board
    return await recalculate_and_store_board()

router = APIRouter()


def _compute_user_position(user_id: str, all_users: dict | None) -> tuple[int, list]:
    """Safely compute user position and sorted users list from Firebase RTDB data."""
    if not isinstance(all_users, dict):
        all_users = {}
    sorted_users = []
    for uid, u in all_users.items():
        if isinstance(u, dict):
            try:
                bal = float(u.get("balance", 0))
                if bal > 0:
                    sorted_users.append((uid, bal))
            except (ValueError, TypeError):
                pass
    sorted_users.sort(key=lambda x: -x[1])
    pos = next((i + 1 for i, (uid, _) in enumerate(sorted_users) if uid == user_id), len(sorted_users) or 1)
    return pos, sorted_users


@router.post("/create-order")
async def create_order(request: Request):
    """
    Create a Cashfree payment order for a leaderboard bid.
    Requires authenticated user (JWT).
    Body: { amount: number }
    """
    try:
        user = decode_token(request)
        if not user:
            return JSONResponse({"error": "Not authenticated"}, status_code=401)

        body = await request.json()
        amount = body.get("amount")

        if not amount or not isinstance(amount, (int, float)) or amount < 1:
            return JSONResponse({"error": "Invalid amount"}, status_code=400)

        user_id = user["sub"]
        user_name = user.get("name", "Builder")

        import re
        clean_user_id = re.sub(r"[^a-zA-Z0-9_-]", "_", str(user_id))[:40] or "user_1"
        order_id = f"lb_{clean_user_id}_{int(time.time())}_{uuid.uuid4().hex[:4]}"[:45]

        test_env = settings.TEST_ENV

        # If TEST_ENV is true, simulate payment fulfillment immediately
        if test_env:
            print(f"[Cashfree Test Mode] Simulating payment order for {clean_user_id} (Amount: INR {amount})")
            now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

            current_balance = 0.0
            user_handle = ""
            try:
                user_data = await db.get(f"leaderboard/users/{user_id}")
                if isinstance(user_data, dict):
                    current_balance = float(user_data.get("balance", 0))
                    user_handle = user_data.get("handle", "")
            except Exception as e:
                print(f"[Firebase Warning] Could not fetch user data: {e}")

            new_balance = current_balance + float(amount)
            payment_count = int(user_data.get("paymentCount", 0)) + 1 if isinstance(user_data, dict) else 1

            # Update full user payment record in Firebase RTDB
            try:
                await db.patch(
                    f"leaderboard/users/{user_id}",
                    {
                        "balance": new_balance,
                        "lastPaidAt": now,
                        "lastPaidAmount": float(amount),
                        "paymentCount": payment_count,
                    },
                )
                await db.put(
                    f"leaderboard/pendingOrders/{order_id}",
                    {
                        "userId": user_id,
                        "userName": user_name,
                        "userHandle": user_handle,
                        "amount": float(amount),
                        "status": "completed",
                        "createdAt": now,
                        "completedAt": now,
                    },
                )
            except Exception as e:
                print(f"[Firebase Error] Could not write to Firebase: {e}")

            position = 1
            try:
                entries, _ = await _recalculate()
                position = next((e["position"] for e in entries if e["id"] == user_id), 1)
            except Exception as e:
                print(f"[Firebase Warning] Rank calculation error: {e}")

            # Add activity event
            try:
                await db.post(
                    "leaderboard/activity",
                    {
                        "type": "claim" if current_balance == 0 else "topup",
                        "userId": user_id,
                        "userName": user_name,
                        "userHandle": user_handle,
                        "amount": float(amount),
                        "newBalance": new_balance,
                        "position": position,
                        "timestamp": now,
                    },
                )
            except Exception as e:
                print(f"[Firebase Warning] Activity post failed: {e}")

            return JSONResponse(
                {
                    "orderId": order_id,
                    "paymentSessionId": f"session_sim_{order_id}",
                    "environment": "TEST",
                    "simulated": True,
                }
            )

        app_url = settings.APP_URL
        # Cashfree PROD requires https:// on return_url
        cf_return_url = app_url
        if settings.CASHFREE_ENV == "PROD" and cf_return_url.startswith("http://"):
            cf_return_url = "https://" + cf_return_url[len("http://"):]

        return_url = (
            f"{cf_return_url}/leaderboard"
            f"?payment_status={{order_status}}"
            f"&order_id={order_id}"
        )
        notify_url = f"{app_url}/api/cashfree/webhook"

        result = await cashfree.create_order(
            order_id=order_id,
            amount=float(amount),
            customer_id=user_id,
            customer_name=user_name,
            return_url=return_url,
            notify_url=notify_url,
        )

        payment_session_id = result.get("payment_session_id")
        if not payment_session_id:
            return JSONResponse(
                {"error": "Failed to create payment session from Cashfree"},
                status_code=500,
            )

        # Store pending order in Firebase
        try:
            await db.put(
                f"leaderboard/pendingOrders/{order_id}",
                {
                    "userId": user_id,
                    "userName": user_name,
                    "amount": float(amount),
                    "status": "pending",
                    "createdAt": time.strftime(
                        "%Y-%m-%dT%H:%M:%SZ", time.gmtime()
                    ),
                },
            )
        except Exception as e:
            print(f"[Firebase Warning] Failed to write pending order: {e}")

        cfg_cf = cashfree.get_cashfree_config()
        return JSONResponse(
            {
                "orderId": order_id,
                "paymentSessionId": payment_session_id,
                "environment": cfg_cf["ENV"],
            }
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            {"error": f"Payment creation failed: {str(e)}"},
            status_code=500,
        )


@router.post("/webhook")
async def payment_webhook(request: Request):
    """
    Cashfree payment webhook.
    Verifies signature, updates user balance, recalculates positions.
    """
    raw_body = await request.body()
    timestamp = request.headers.get("x-webhook-timestamp", "")
    signature = request.headers.get("x-webhook-signature", "")

    # Verify signature
    if signature and not cashfree.verify_webhook_signature(
        raw_body, timestamp, signature
    ):
        return JSONResponse({"error": "Invalid signature"}, status_code=403)

    body = await request.json()
    event_type = body.get("type", "")

    if event_type != "PAYMENT_SUCCESS_WEBHOOK":
        return JSONResponse({"status": "ignored"})

    order_data = body.get("data", {}).get("order", {})
    order_id = order_data.get("order_id", "")
    order_amount = float(order_data.get("order_amount", 0))

    if not order_id:
        return JSONResponse({"error": "No order_id"}, status_code=400)

    # Fetch pending order from Firebase
    pending = await db.get(f"leaderboard/pendingOrders/{order_id}")
    if not pending or not isinstance(pending, dict):
        return JSONResponse({"error": "Order not found"}, status_code=404)

    if pending.get("status") == "completed":
        return JSONResponse({"status": "already_processed"})

    user_id = pending["userId"]
    user_name = pending["userName"]
    amount = pending["amount"]

    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Update user balance (accumulate) and full payment metadata
    user_data = await db.get(f"leaderboard/users/{user_id}")
    user_data = user_data if isinstance(user_data, dict) else {}
    current_balance = float(user_data.get("balance", 0))
    new_balance = current_balance + amount
    payment_count = int(user_data.get("paymentCount", 0)) + 1
    user_handle = user_data.get("handle", "")

    await db.patch(
        f"leaderboard/users/{user_id}",
        {
            "balance": new_balance,
            "lastPaidAt": now,
            "lastPaidAmount": amount,
            "paymentCount": payment_count,
        },
    )

    # Mark order completed
    await db.patch(
        f"leaderboard/pendingOrders/{order_id}",
        {"status": "completed", "completedAt": now},
    )

    # Recalculate all positions and update Firebase stats
    try:
        entries, _ = await _recalculate()
        new_position = next((e["position"] for e in entries if e["id"] == user_id), 1)
    except Exception as e:
        print(f"[Warning] Failed to recalculate board: {e}")
        all_users = await db.get("leaderboard/users")
        new_position, _ = _compute_user_position(user_id, all_users)

    activity_type = "claim" if current_balance == 0 else "topup"

    await db.post(
        "leaderboard/activity",
        {
            "type": activity_type,
            "userId": user_id,
            "userName": user_name,
            "userHandle": user_handle,
            "amount": amount,
            "newBalance": new_balance,
            "position": new_position,
            "timestamp": now,
        },
    )

    return JSONResponse(
        {
            "status": "success",
            "userId": user_id,
            "newBalance": new_balance,
            "position": new_position,
        }
    )


@router.get("/verify-payment/{order_id}")
async def verify_payment(order_id: str, request: Request):
    """
    Client calls this after returning from Cashfree to check payment status.
    Also processes the payment if the webhook hasn't arrived yet.
    """
    user = decode_token(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    # Check if already processed
    pending = await db.get(f"leaderboard/pendingOrders/{order_id}")
    if pending and isinstance(pending, dict) and pending.get("status") == "completed":
        user_data = await db.get(f"leaderboard/users/{user['sub']}")
        user_data = user_data if isinstance(user_data, dict) else {}
        balance = float(user_data.get("balance", 0))

        # Compute position
        all_users = await db.get("leaderboard/users")
        position, _ = _compute_user_position(user["sub"], all_users)

        return JSONResponse(
            {
                "status": "completed",
                "balance": balance,
                "position": position,
                "amount": pending.get("amount", 0),
            }
        )

    # Check with Cashfree directly
    try:
        order_status = await cashfree.get_order(order_id)
        if order_status.get("order_status") == "PAID":
            if pending and isinstance(pending, dict) and pending.get("status") != "completed":
                user_id = pending["userId"]
                amount = float(pending["amount"])
                now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

                user_data = await db.get(f"leaderboard/users/{user_id}")
                user_data = user_data if isinstance(user_data, dict) else {}
                current_balance = float(user_data.get("balance", 0))
                new_balance = current_balance + amount
                payment_count = int(user_data.get("paymentCount", 0)) + 1

                await db.patch(
                    f"leaderboard/users/{user_id}",
                    {
                        "balance": new_balance,
                        "lastPaidAt": now,
                        "lastPaidAmount": amount,
                        "paymentCount": payment_count,
                    },
                )
                await db.patch(
                    f"leaderboard/pendingOrders/{order_id}",
                    {"status": "completed", "completedAt": now},
                )

                # Recalculate and persist all positions + stats
                try:
                    entries, _ = await _recalculate()
                    position = next((e["position"] for e in entries if e["id"] == user_id), 1)
                except Exception:
                    all_users = await db.get("leaderboard/users")
                    position, _ = _compute_user_position(user_id, all_users)

                # Activity event
                await db.post(
                    "leaderboard/activity",
                    {
                        "type": "claim" if current_balance == 0 else "topup",
                        "userId": user_id,
                        "userName": pending.get("userName", ""),
                        "userHandle": user_data.get("handle", ""),
                        "amount": amount,
                        "newBalance": new_balance,
                        "position": position,
                        "timestamp": now,
                    },
                )

                return JSONResponse(
                    {
                        "status": "completed",
                        "balance": new_balance,
                        "position": position,
                        "amount": amount,
                    }
                )

        return JSONResponse(
            {"status": order_status.get("order_status", "unknown")}
        )
    except Exception as e:
        return JSONResponse(
            {"status": "error", "error": str(e)}, status_code=500
        )
