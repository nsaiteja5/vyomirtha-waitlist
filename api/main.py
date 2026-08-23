"""
Vyomirtha API — FastAPI backend.
Serves X OAuth, Cashfree payments, and leaderboard data.
"""
import os
import sys

# Configure UTF-8 for console output on Windows to prevent UnicodeEncodeError
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Add api/ to path so service/route imports work
sys.path.insert(0, os.path.dirname(__file__))

from config import settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth import router as auth_router
from routes.cashfree_routes import router as cashfree_router
from routes.leaderboard_routes import router as leaderboard_router

app = FastAPI(title="Vyomirtha API", docs_url="/api/docs", redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(cashfree_router, prefix="/api/cashfree", tags=["cashfree"])
app.include_router(
    leaderboard_router, prefix="/api/leaderboard", tags=["leaderboard"]
)

# Resilient fallbacks in case ASGI wrapper strips /api prefix
app.include_router(auth_router, prefix="/auth", include_in_schema=False)
app.include_router(cashfree_router, prefix="/cashfree", include_in_schema=False)
app.include_router(
    leaderboard_router, prefix="/leaderboard", include_in_schema=False
)


from fastapi.responses import FileResponse

@app.get("/api/health")
@app.get("/health")
async def health():
    return {"status": "ok", "service": "vyomirtha-api"}


@app.get("/me.jpg")
async def get_me_dp():
    img_path = os.path.join(os.path.dirname(__file__), "..", "me.jpg")
    if os.path.exists(img_path):
        return FileResponse(img_path, media_type="image/jpeg")
    return {"error": "me.jpg not found"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.API_PORT,
        reload=True,
        reload_dirs=[os.path.dirname(__file__)],
    )
