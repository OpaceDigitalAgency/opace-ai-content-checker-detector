"""Chrome extension server-channel credentials with no bundled secret.

The extension supplies its public runtime ID plus non-secret random install and
request identifiers.  A short-lived signed challenge and one-shot score token
bind one body hash to that exact channel, caller network and extension install.
The extension ID is public and an install ID can be copied, so these claims
provide continuity and replay control rather than pretending an open client is
trusted.  Origin, an allowlisted extension ID, proof of work and layered rate
limits are all still required by the HTTP layer.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time


CHANNEL = "chrome-extension-v1"
CHALLENGE_KIND = "chrome-extension-challenge-v1"
TOKEN_KIND = "chrome-extension-score-v1"
_REQUIRED = {
    "v", "channel", "kind", "iat", "exp", "network", "extension_id",
    "install_id", "request_id", "body_sha256", "jti",
}


def body_sha256(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()


def issue_challenge(secret: bytes, *, network: str, extension_id: str,
                    install_id: str, request_id: str, body_hash: str,
                    ttl_seconds: int,
                    now: int | None = None) -> tuple[str, dict]:
    issued = int(time.time() if now is None else now)
    claims = {
        "v": 1,
        "channel": CHANNEL,
        "kind": CHALLENGE_KIND,
        "iat": issued,
        "exp": issued + ttl_seconds,
        "network": network,
        "extension_id": extension_id,
        "install_id": install_id,
        "request_id": request_id,
        "body_sha256": body_hash,
        "jti": _b64(secrets.token_bytes(12)),
    }
    return _encode(secret, CHALLENGE_KIND, claims), claims


def verify_challenge(secret: bytes, challenge: str, *, network: str,
                     nonce: str, difficulty_bits: int,
                     now: int | None = None) -> tuple[dict | None, str | None]:
    claims, error = _decode(secret, CHALLENGE_KIND, challenge, now=now)
    if error:
        return None, error
    if not hmac.compare_digest(claims["network"], network):
        return None, "challenge_not_yours"
    if not nonce or len(nonce) > 64:
        return None, "bad_nonce"
    digest = hashlib.sha256(f"{challenge}:{nonce}".encode("utf-8")).digest()
    if leading_zero_bits(digest) < difficulty_bits:
        return None, "insufficient_work"
    return claims, None


def issue_score_token(secret: bytes, challenge_claims: dict, *,
                      ttl_seconds: int,
                      now: int | None = None) -> tuple[str, dict]:
    issued = int(time.time() if now is None else now)
    claims = {
        **{key: challenge_claims[key] for key in _REQUIRED},
        "kind": TOKEN_KIND,
        "iat": issued,
        "exp": issued + ttl_seconds,
        "jti": _b64(secrets.token_bytes(12)),
    }
    return _encode(secret, TOKEN_KIND, claims), claims


def verify_score_token(secret: bytes, token: str | None, *, network: str,
                       extension_id: str, install_id: str, request_id: str,
                       body_hash: str,
                       now: int | None = None) -> tuple[dict | None, str | None]:
    if not token:
        return None, "token_missing"
    claims, error = _decode(secret, TOKEN_KIND, token, now=now)
    if error:
        return None, error
    comparisons = (
        ("network", network, "token_not_yours"),
        ("extension_id", extension_id, "token_wrong_extension"),
        ("install_id", install_id, "token_wrong_install"),
        ("request_id", request_id, "token_wrong_request"),
        ("body_sha256", body_hash, "token_wrong_body"),
    )
    for key, actual, code in comparisons:
        if not hmac.compare_digest(claims[key], actual):
            return None, code
    return claims, None


def solve_challenge(challenge: str, difficulty_bits: int) -> str:
    """Test/development helper; production JS performs the same SHA-256 loop."""
    nonce = 0
    while True:
        value = str(nonce)
        digest = hashlib.sha256(f"{challenge}:{value}".encode("utf-8")).digest()
        if leading_zero_bits(digest) >= difficulty_bits:
            return value
        nonce += 1


def leading_zero_bits(digest: bytes) -> int:
    bits = 0
    for byte in digest:
        if byte:
            return bits + (8 - byte.bit_length())
        bits += 8
    return bits


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _encode(secret: bytes, kind: str, claims: dict) -> str:
    payload = _b64(json.dumps(claims, sort_keys=True, separators=(",", ":"),
                              ensure_ascii=True).encode("ascii"))
    signature = _b64(hmac.new(secret, f"{kind}|{payload}".encode("ascii"),
                              hashlib.sha256).digest())
    return f"v1.{payload}.{signature}"


def _decode(secret: bytes, kind: str, token: str, *,
            now: int | None = None) -> tuple[dict | None, str | None]:
    if not isinstance(token, str) or len(token) > 2048:
        return None, "token_malformed"
    parts = token.split(".")
    if len(parts) != 3 or parts[0] != "v1":
        return None, "token_malformed"
    payload, signature = parts[1:]
    expected = _b64(hmac.new(secret, f"{kind}|{payload}".encode("ascii"),
                             hashlib.sha256).digest())
    if not hmac.compare_digest(signature, expected):
        return None, "token_invalid"
    try:
        claims = json.loads(_unb64(payload).decode("ascii"))
    except (ValueError, UnicodeError, json.JSONDecodeError):
        return None, "token_malformed"
    if not isinstance(claims, dict) or set(claims) != _REQUIRED:
        return None, "token_malformed"
    if (claims.get("v") != 1 or claims.get("channel") != CHANNEL
            or claims.get("kind") != kind):
        return None, "token_wrong_channel"
    if not all(isinstance(claims.get(key), str) for key in (
            "network", "extension_id", "install_id", "request_id",
            "body_sha256", "jti")):
        return None, "token_malformed"
    if not isinstance(claims.get("iat"), int) or not isinstance(claims.get("exp"), int):
        return None, "token_malformed"
    current = int(time.time() if now is None else now)
    if claims["iat"] > current + 5:
        return None, "token_not_yet_valid"
    if claims["exp"] <= current:
        return None, "token_expired"
    return claims, None
