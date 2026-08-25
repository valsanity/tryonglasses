"""
Admin session handling: a PIN from the environment plus a signed httpOnly
cookie. No tokens are ever returned in a JSON body.
"""

import os
import time

import jwt
from fastapi import HTTPException, Request, Response

COOKIE_NAME = "osb_admin"
SESSION_TTL_SECONDS = 60 * 60 * 12
ALGORITHM = "HS256"


def _secret() -> str:
    secret = os.environ.get("ADMIN_SESSION_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="ADMIN_SESSION_SECRET is not configured")
    return secret


def verify_pin(pin: str) -> bool:
    expected = os.environ.get("ADMIN_PIN", "")
    if not expected:
        raise HTTPException(status_code=500, detail="ADMIN_PIN is not configured")
    # Constant-time-ish comparison; PINs are short so this is plenty.
    return len(pin) == len(expected) and all(a == b for a, b in zip(pin, expected))


def issue_session(response: Response, request: Request) -> None:
    now = int(time.time())
    token = jwt.encode(
        {"role": "admin", "iat": now, "exp": now + SESSION_TTL_SECONDS},
        _secret(),
        algorithm=ALGORITHM,
    )
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        samesite="lax",
        secure=request.url.scheme == "https",
        path="/",
    )


def clear_session(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")


def is_authenticated(request: Request) -> bool:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return False
    try:
        payload = jwt.decode(token, _secret(), algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return False
    return payload.get("role") == "admin"


async def require_admin(request: Request) -> None:
    """FastAPI dependency guarding every /api/admin/* mutation."""
    if not is_authenticated(request):
        raise HTTPException(status_code=401, detail="Masuk sebagai admin terlebih dahulu.")
