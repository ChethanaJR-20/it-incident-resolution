"""Security utilities for password hashing and authentication tokens."""

import hashlib
import secrets
from typing import Optional


def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with a cryptographically secure random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"{salt}${key.hex()}"


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """Verifies a plain password against the stored salt$hash string."""
    if not hashed_password:
        return False
    try:
        salt, key_hex = hashed_password.split("$", 1)
        check = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100_000)
        return secrets.compare_digest(check.hex(), key_hex)
    except Exception:
        return False


def generate_token(user_id: str) -> str:
    """Generates a secure random access token for the session."""
    return f"token_{user_id}_{secrets.token_hex(20)}"

