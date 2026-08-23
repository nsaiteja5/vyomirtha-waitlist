"""
Vyomirtha Backend Configuration Module.
Single source of truth for all environment variables and configuration settings.
"""
import os
from dotenv import load_dotenv

# Find and load the .env file from project root (one level up from api/)
_env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path, override=True)
load_dotenv(override=True)


def get_bool(key: str, default: bool = False) -> bool:
    val = os.getenv(key, str(default)).strip().lower()
    return val in ("true", "1", "yes", "on")


def get_str(key: str, default: str = "") -> str:
    return os.getenv(key, default).strip()


class Settings:
    @property
    def TEST_ENV(self) -> bool:
        """If True, bypasses X OAuth and simulates Cashfree payments without charging."""
        return get_bool("TEST_ENV", False)

    @property
    def CASHFREE_ENV(self) -> str:
        """TEST (Sandbox) or PROD (Production)."""
        return get_str("CASHFREE_ENV", "TEST").upper()

    @property
    def CASHFREE_APP_ID(self) -> str:
        return get_str("CASHFREE_APP_ID", "")

    @property
    def CASHFREE_SECRET_KEY(self) -> str:
        return get_str("CASHFREE_SECRET_KEY", "")

    @property
    def CASHFREE_BASE_URL(self) -> str:
        if self.CASHFREE_ENV == "PROD":
            return "https://api.cashfree.com/pg"
        return "https://sandbox.cashfree.com/pg"

    @property
    def CASHFREE_API_VERSION(self) -> str:
        return get_str("CASHFREE_API_VERSION", "2023-08-01")

    @property
    def APP_URL(self) -> str:
        """Frontend App URL for OAuth redirects and webhooks."""
        url = get_str("VITE_APP_URL", "") or get_str("APP_URL", "")
        if not url:
            vercel_url = get_str("VERCEL_URL", "")
            if vercel_url:
                url = f"https://{vercel_url}"
            else:
                url = "https://vyomirtha.com"
        if not url.startswith("http://") and not url.startswith("https://"):
            url = f"https://{url}"
        return url.rstrip("/")

    @property
    def FIREBASE_DATABASE_URL(self) -> str:
        url = get_str(
            "VITE_FIREBASE_DATABASE_URL",
            "https://vyomirtha-default-rtdb.asia-southeast1.firebasedatabase.app",
        )
        return url.rstrip("/")

    @property
    def X_CLIENT_ID(self) -> str:
        return get_str("X_CLIENT_ID", "")

    @property
    def X_CLIENT_SECRET(self) -> str:
        return get_str("X_CLIENT_SECRET", "")

    @property
    def JWT_SECRET(self) -> str:
        return get_str(
            "JWT_SECRET",
            "vyomirtha_production_jwt_secret_key_super_secure_2026_default",
        )

    @property
    def API_PORT(self) -> int:
        try:
            return int(get_str("API_PORT", "8000"))
        except ValueError:
            return 8000


settings = Settings()
