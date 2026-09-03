"""HTTP/security tests for the distinct WordPress inference channel."""
from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

from fastapi.testclient import TestClient
import pytest


HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
os.environ["TOKEN_SECRET"] = "test-only-wordpress-channel-secret-32-bytes"
os.environ["QUOTA_BACKEND"] = "memory"
os.environ["WP_REPLAY_BACKEND"] = "memory"
os.environ["ENABLE_WORDPRESS_CHANNEL"] = "1"
os.environ["ENABLE_CHROME_CHANNEL"] = "1"
os.environ["CHROME_EXTENSION_IDS"] = "a" * 32
os.environ["ALLOWED_ORIGINS"] = "https://opace.agency"
os.environ["MODEL_PATH"] = str(
    HERE / "model" / "tier3-cycle5-full-e5small-fp32.onnx")
os.environ["TOKENIZER_DIR"] = str(HERE / "model" / "tokenizer")
os.environ["MODEL_CONFIG_PATH"] = str(
    HERE / "model" / "tier3-cycle5-full-config.json")
os.environ["THRESHOLDS_PATH"] = str(
    HERE / "model" / "thresholds.cycle5.json")

import app as service  # noqa: E402
import extension_channel as chrome_channel  # noqa: E402
import wordpress_channel as wp  # noqa: E402


SITE = "sha256:" + "a" * 64
OTHER_SITE = "sha256:" + "b" * 64
INSTALL = "wp_abcdefghijklmnop"
OTHER_INSTALL = "wp_otherinstallidentifier"
REQUEST = "req_abcdefghijklmnop"
OTHER_REQUEST = "req_otherrequestidentifier"
TEXT = " ".join(["measured"] * 80)
EXTENSION = "a" * 32
OTHER_EXTENSION = "b" * 32
CHROME_INSTALL = "cx_abcdefghijklmnop"
CHROME_ORIGIN = f"chrome-extension://{EXTENSION}"
IP = "203.0.113.9"
OTHER_IP = "198.51.100.8"


class _StubQuota:
    """The shape /v1/status and _process_check both read, with no arithmetic."""

    def snapshot(self):
        return {
            "cap": 12000, "used_estimate": 0, "remaining_estimate": 12000,
            "channels": {
                channel: {"floor": 0, "used_estimate": 0,
                          "floor_remaining_estimate": 0,
                          "floor_protected_now": 0}
                for channel in service.QUOTA_CHANNELS},
            "shared_pool_remaining_estimate": 0,
            "available_now_estimate": 12000, "burst": 12000,
            "accrual_per_hour": 0.0, "resets_in_seconds": 3600,
            "backend": "memory"}


class AllowQuota(_StubQuota):
    def reserve(self, cost, channel=None):
        return True, 11999, 0, 3600, ""


class RefuseQuota(_StubQuota):
    def reserve(self, cost, channel=None):
        return False, 0, 60, 3600, "paced_allowance"


def fake_score(_text):
    return ([{
        "index": 0,
        "word_start": 0,
        "word_end": 80,
        "words": 80,
        "char_start": 0,
        "char_end": len(TEXT),
        "probability_ai": 0.1,
        "margin": -2.0,
        "flagged": False,
        "tokens_scored": 80,
        "truncated": False,
    }], 1)


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(service, "ENABLE_WORDPRESS_CHANNEL", True)
    monkeypatch.setattr(service, "ENABLE_CHROME_CHANNEL", True)
    monkeypatch.setattr(service, "CHROME_EXTENSION_IDS", {EXTENSION})
    service.WP_REPLAY_LEDGER = service.SingleUseLedger("memory")
    service.CHROME_REPLAY_LEDGER = service.SingleUseLedger(
        "memory", collection="test_chrome_replay")
    # A fresh durable per-site meter for every test. Module-level state would
    # otherwise carry one test's site usage into the next and make the hourly
    # ceiling fire somewhere unrelated to the case under test.
    service.WP_SITE_QUOTA = service.SiteQuota("memory")
    service.WP_HANDSHAKE_LIMITER = service.WeightedLimiter(
        [(60, 1000), (3600, 1000), (86400, 1000)])
    service.CHROME_HANDSHAKE_LIMITER = service.WeightedLimiter(
        [(60, 1000), (3600, 1000), (86400, 1000)])
    service.REQUEST_LIMITER = service.WeightedLimiter(
        [(60, 1000), (3600, 1000), (86400, 1000)])
    service.INFERENCE_LIMITER = service.WeightedLimiter(
        [(60, 1000), (3600, 1000), (86400, 1000)])
    monkeypatch.setattr(service, "QUOTA", AllowQuota())
    monkeypatch.setattr(service, "_score_document", fake_score)
    cors = next(
        middleware for middleware in service.APP.user_middleware
        if middleware.cls is service.CORSMiddleware)
    monkeypatch.setitem(
        cors.kwargs, "allow_origins",
        [*service.ALLOWED_ORIGINS, CHROME_ORIGIN])
    # Other test modules may have imported and built this FastAPI app before
    # this file set its isolated channel environment. Rebuild the middleware
    # stack from the fixture's exact allowlist, then discard it before
    # monkeypatch restores the original configuration.
    service.APP.middleware_stack = None
    try:
        with TestClient(service.APP, raise_server_exceptions=False) as value:
            yield value
    finally:
        service.APP.middleware_stack = None


def challenge_body(text=TEXT, *, site=SITE, install=INSTALL, request=REQUEST):
    return {
        "site_id": site,
        "install_id": install,
        "request_id": request,
        "body_sha256": wp.body_sha256(text),
    }


def wp_headers(ip=IP, token=None):
    result = {
        "x-forwarded-for": ip,
        "user-agent": "WordPress/6.7; https://example.test",
    }
    if token:
        result["x-opace-wordpress-token"] = token
    return result


def issue(client, text=TEXT, *, site=SITE, install=INSTALL, request=REQUEST,
          ip=IP):
    challenge_response = client.post(
        "/v1/wordpress/challenge",
        json=challenge_body(text, site=site, install=install, request=request),
        headers=wp_headers(ip))
    assert challenge_response.status_code == 200, challenge_response.text
    challenge_value = challenge_response.json()["challenge"]
    nonce = wp.solve_challenge(challenge_value, service.WP_POW_BITS)
    token_response = client.post(
        "/v1/wordpress/token",
        json={"challenge": challenge_value, "nonce": nonce},
        headers=wp_headers(ip))
    assert token_response.status_code == 200, token_response.text
    return challenge_value, nonce, token_response.json()["token"]


def check_body(text=TEXT, *, site=SITE, install=INSTALL, request=REQUEST):
    return {
        "text": text,
        "full_word_count": len(text.split()),
        "site_id": site,
        "install_id": install,
        "request_id": request,
    }


def chrome_headers(ip=IP, token=None, origin=CHROME_ORIGIN):
    result = {"x-forwarded-for": ip, "origin": origin,
              "user-agent": "Mozilla/5.0 Chrome extension integration test"}
    if token:
        result["x-opace-chrome-token"] = token
    return result


def chrome_challenge_body(text=TEXT, *, extension=EXTENSION,
                          install=CHROME_INSTALL, request=REQUEST):
    return {
        "extension_id": extension,
        "install_id": install,
        "request_id": request,
        "body_sha256": chrome_channel.body_sha256(text),
    }


def chrome_check_body(text=TEXT, *, extension=EXTENSION,
                      install=CHROME_INSTALL, request=REQUEST):
    return {
        "text": text,
        "full_word_count": len(text.split()),
        "extension_id": extension,
        "install_id": install,
        "request_id": request,
    }


def issue_chrome(client, text=TEXT, *, extension=EXTENSION,
                 install=CHROME_INSTALL, request=REQUEST, ip=IP,
                 origin=CHROME_ORIGIN):
    challenge_response = client.post(
        "/v1/chrome/challenge",
        json=chrome_challenge_body(
            text, extension=extension, install=install, request=request),
        headers=chrome_headers(ip, origin=origin))
    assert challenge_response.status_code == 200, challenge_response.text
    challenge_value = challenge_response.json()["challenge"]
    nonce = chrome_channel.solve_challenge(
        challenge_value, service.CHROME_POW_BITS)
    token_response = client.post(
        "/v1/chrome/token",
        json={"challenge": challenge_value, "nonce": nonce},
        headers=chrome_headers(ip, origin=origin))
    assert token_response.status_code == 200, token_response.text
    return challenge_value, nonce, token_response.json()["token"]


def test_wordpress_happy_path_needs_no_origin_or_browser_ua(client):
    _challenge, _nonce, token = issue(client)
    response = client.post(
        "/v1/wordpress/check", json=check_body(),
        headers=wp_headers(token=token))
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["channel"] == wp.CHANNEL
    assert result["processed"] == "server"
    assert result["retained"] == "nothing"
    assert TEXT not in response.text


def test_chrome_happy_path_requires_exact_allowlisted_extension_origin(client):
    _challenge, _nonce, token = issue_chrome(client)
    response = client.post(
        "/v1/chrome/check", json=chrome_check_body(),
        headers=chrome_headers(token=token))
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["channel"] == chrome_channel.CHANNEL
    assert result["processed"] == "server"
    assert result["retained"] == "nothing"
    assert TEXT not in response.text
    assert response.headers["access-control-allow-origin"] == CHROME_ORIGIN


def test_chrome_rejects_missing_wrong_and_unlisted_origins_before_inference(
        client, monkeypatch):
    calls = []
    monkeypatch.setattr(
        service, "_score_document",
        lambda text: calls.append(text) or fake_score(text))
    missing = client.post(
        "/v1/chrome/challenge", json=chrome_challenge_body(),
        headers={"x-forwarded-for": IP})
    assert missing.status_code == 403
    assert missing.json()["error"] == "extension_origin_required"
    wrong = client.post(
        "/v1/chrome/challenge", json=chrome_challenge_body(),
        headers=chrome_headers(origin="chrome-extension://" + OTHER_EXTENSION))
    assert wrong.status_code == 403
    assert wrong.json()["error"] == "extension_origin_required"
    unlisted = client.post(
        "/v1/chrome/challenge",
        json=chrome_challenge_body(extension=OTHER_EXTENSION),
        headers=chrome_headers(
            origin="chrome-extension://" + OTHER_EXTENSION))
    assert unlisted.status_code == 403
    assert unlisted.json()["error"] == "extension_not_allowed"
    assert calls == []


def test_chrome_challenge_and_token_are_single_use_and_body_bound(client):
    challenge_value, nonce, token = issue_chrome(client)
    replay_exchange = client.post(
        "/v1/chrome/token",
        json={"challenge": challenge_value, "nonce": nonce},
        headers=chrome_headers())
    assert replay_exchange.status_code == 409
    assert replay_exchange.json()["error"] == "challenge_replayed"

    wrong_body = client.post(
        "/v1/chrome/check",
        json=chrome_check_body(text=TEXT + " changed"),
        headers=chrome_headers(token=token))
    assert wrong_body.status_code == 401
    assert wrong_body.json()["detail"] == "token_wrong_body"

    first = client.post(
        "/v1/chrome/check", json=chrome_check_body(),
        headers=chrome_headers(token=token))
    second = client.post(
        "/v1/chrome/check", json=chrome_check_body(),
        headers=chrome_headers(token=token))
    assert first.status_code == 200
    assert second.status_code == 409
    assert second.json()["error"] == "token_replayed"


def test_browser_and_wordpress_credentials_are_mutually_exclusive(client):
    net = service._network(IP)
    browser_token, _expiry = service._mint_token(service._bind(net))
    wordpress_response = client.post(
        "/v1/wordpress/check", json=check_body(),
        headers=wp_headers(token=browser_token))
    assert wordpress_response.status_code == 401
    assert wordpress_response.json()["detail"] == "token_malformed"

    _challenge, _nonce, wordpress_token = issue(client)
    browser_response = client.post(
        "/v1/check", json={"text": TEXT}, headers={
            "x-forwarded-for": IP,
            "origin": "https://opace.agency",
            "user-agent": "Mozilla/5.0 integration test browser",
            "x-opace-token": wordpress_token,
        })
    assert browser_response.status_code == 401
    assert browser_response.json()["detail"] == "token_malformed"


def test_all_three_credential_classes_are_mutually_exclusive(client):
    _challenge, _nonce, wordpress_token = issue(client)
    chrome_with_wordpress = client.post(
        "/v1/chrome/check", json=chrome_check_body(),
        headers=chrome_headers(token=wordpress_token))
    assert chrome_with_wordpress.status_code == 401
    assert chrome_with_wordpress.json()["detail"] == "token_invalid"

    _challenge, _nonce, chrome_token = issue_chrome(
        client, request=OTHER_REQUEST)
    wordpress_with_chrome = client.post(
        "/v1/wordpress/check",
        json=check_body(request=OTHER_REQUEST),
        headers=wp_headers(token=chrome_token))
    assert wordpress_with_chrome.status_code == 401
    assert wordpress_with_chrome.json()["detail"] == "token_invalid"

    browser_with_chrome = client.post(
        "/v1/check", json={"text": TEXT}, headers={
            "x-forwarded-for": IP,
            "origin": "https://opace.agency",
            "user-agent": "Mozilla/5.0 integration test browser",
            "x-opace-token": chrome_token,
        })
    assert browser_with_chrome.status_code == 401
    assert browser_with_chrome.json()["detail"] == "token_malformed"


def test_challenge_and_score_token_are_each_single_use(client, monkeypatch):
    calls = []
    monkeypatch.setattr(service, "_score_document",
                        lambda text: calls.append(text) or fake_score(text))
    challenge_value, nonce, token = issue(client)
    replay_exchange = client.post(
        "/v1/wordpress/token",
        json={"challenge": challenge_value, "nonce": nonce},
        headers=wp_headers())
    assert replay_exchange.status_code == 409
    assert replay_exchange.json()["error"] == "challenge_replayed"

    first = client.post(
        "/v1/wordpress/check", json=check_body(),
        headers=wp_headers(token=token))
    second = client.post(
        "/v1/wordpress/check", json=check_body(),
        headers=wp_headers(token=token))
    assert first.status_code == 200
    assert second.status_code == 409
    assert second.json()["error"] == "token_replayed"
    assert len(calls) == 1


@pytest.mark.parametrize(
    "body,ip,error",
    [
        (check_body(text=TEXT + " changed"), IP, "token_wrong_body"),
        (check_body(site=OTHER_SITE), IP, "token_wrong_site"),
        (check_body(install=OTHER_INSTALL), IP, "token_wrong_install"),
        (check_body(request=OTHER_REQUEST), IP, "token_wrong_request"),
        (check_body(), OTHER_IP, "token_not_yours"),
    ],
)
def test_wrong_body_site_install_request_or_network_rejected_before_inference(
        client, monkeypatch, body, ip, error):
    calls = []
    monkeypatch.setattr(service, "_score_document",
                        lambda text: calls.append(text) or fake_score(text))
    _challenge, _nonce, token = issue(client)
    response = client.post(
        "/v1/wordpress/check", json=body,
        headers=wp_headers(ip, token))
    assert response.status_code == 401
    assert response.json()["detail"] == error
    assert calls == []


def test_under_difficulty_and_expired_credentials_fail_before_inference(
        client, monkeypatch):
    calls = []
    monkeypatch.setattr(service, "_score_document",
                        lambda text: calls.append(text) or fake_score(text))
    challenge_response = client.post(
        "/v1/wordpress/challenge", json=challenge_body(),
        headers=wp_headers())
    challenge_value = challenge_response.json()["challenge"]
    bad_nonce = next(
        str(i) for i in range(100)
        if wp.leading_zero_bits(__import__("hashlib").sha256(
            f"{challenge_value}:{i}".encode()).digest()) < service.WP_POW_BITS)
    weak = client.post(
        "/v1/wordpress/token",
        json={"challenge": challenge_value, "nonce": bad_nonce},
        headers=wp_headers())
    assert weak.status_code == 400
    assert weak.json()["detail"] == "insufficient_work"

    old = int(time.time()) - 1000
    expired_challenge, claims = wp.issue_challenge(
        service.TOKEN_SECRET, network=service._bind(service._network(IP)),
        site_id=SITE, install_id=INSTALL, request_id=REQUEST,
        body_hash=wp.body_sha256(TEXT), ttl_seconds=1, now=old)
    expired_nonce = wp.solve_challenge(expired_challenge, service.WP_POW_BITS)
    expired_exchange = client.post(
        "/v1/wordpress/token",
        json={"challenge": expired_challenge, "nonce": expired_nonce},
        headers=wp_headers())
    assert expired_exchange.status_code == 400
    assert expired_exchange.json()["detail"] == "token_expired"

    expired_token, _claims = wp.issue_score_token(
        service.TOKEN_SECRET, claims, ttl_seconds=1, now=old)
    expired_check = client.post(
        "/v1/wordpress/check", json=check_body(),
        headers=wp_headers(token=expired_token))
    assert expired_check.status_code == 401
    assert expired_check.json()["detail"] == "token_expired"
    assert calls == []


def test_limits_global_quota_and_replay_store_fail_closed(client, monkeypatch):
    calls = []
    monkeypatch.setattr(service, "_score_document",
                        lambda text: calls.append(text) or fake_score(text))

    service.REQUEST_LIMITER = service.WeightedLimiter([(60, 0)])
    _challenge, _nonce, token = issue(client)
    limited = client.post(
        "/v1/wordpress/check", json=check_body(),
        headers=wp_headers(token=token))
    assert limited.status_code == 429
    assert limited.json()["scope"] == "per_connection"
    assert limited.json()["fallback"]["mode"] == "wordpress-local"

    service.REQUEST_LIMITER = service.WeightedLimiter([(60, 1000)])
    service.INFERENCE_LIMITER = service.WeightedLimiter([(60, 0)])
    _challenge, _nonce, token = issue(client, request=OTHER_REQUEST)
    inference_limited = client.post(
        "/v1/wordpress/check",
        json=check_body(request=OTHER_REQUEST),
        headers=wp_headers(token=token))
    assert inference_limited.status_code == 429
    assert inference_limited.json()["unit"] == "inferences"
    assert inference_limited.json()["fallback"]["mode"] == "wordpress-local"

    service.INFERENCE_LIMITER = service.WeightedLimiter([(60, 1000)])
    monkeypatch.setattr(service, "QUOTA", RefuseQuota())
    third_request = "req_thirdrequestidentifier"
    _challenge, _nonce, token = issue(client, request=third_request)
    denied = client.post(
        "/v1/wordpress/check",
        json=check_body(request=third_request),
        headers=wp_headers(token=token))
    assert denied.status_code == 429
    assert denied.json()["error"] == "daily_allowance_exhausted"
    assert denied.json()["fallback"]["mode"] == "wordpress-local"

    service.WP_REPLAY_LEDGER = service.SingleUseLedger("invalid")
    fourth_request = "req_fourthrequestidentifier"
    response = client.post(
        "/v1/wordpress/challenge",
        json=challenge_body(request=fourth_request),
        headers=wp_headers())
    challenge_value = response.json()["challenge"]
    nonce = wp.solve_challenge(challenge_value, service.WP_POW_BITS)
    unavailable = client.post(
        "/v1/wordpress/token",
        json={"challenge": challenge_value, "nonce": nonce},
        headers=wp_headers())
    assert unavailable.status_code == 503
    assert unavailable.json()["error"] == "replay_store_unavailable"
    assert calls == []


def test_size_and_word_limits_refuse_without_truncation(client, monkeypatch):
    calls = []
    monkeypatch.setattr(service, "_score_document",
                        lambda text: calls.append(text) or fake_score(text))
    assert service.MAX_CHARS == 100000
    assert service.MAX_WORDS == 8000
    too_large_text = "x" * 100001
    _challenge, _nonce, token = issue(client, text=too_large_text)
    too_large = client.post(
        "/v1/wordpress/check", json=check_body(text=too_large_text),
        headers=wp_headers(token=token))
    assert too_large.status_code == 413
    assert too_large.json()["processed"] == "none"

    astral_text = "\U0001f600" * 50001
    astral_request = "req_astralboundarytest"
    assert len(astral_text) == 50001
    assert service.utf16_length(astral_text) == 100002
    _challenge, _nonce, token = issue(
        client, text=astral_text, request=astral_request)
    astral_large = client.post(
        "/v1/wordpress/check",
        json=check_body(text=astral_text, request=astral_request),
        headers=wp_headers(token=token))
    assert astral_large.status_code == 413
    assert astral_large.json()["max_chars"] == 100000

    too_long_text = " ".join(["w"] * 8001)
    _challenge, _nonce, token = issue(
        client, text=too_long_text, request=OTHER_REQUEST)
    too_long = client.post(
        "/v1/wordpress/check",
        json=check_body(text=too_long_text, request=OTHER_REQUEST),
        headers=wp_headers(token=token))
    assert too_long.status_code == 413
    assert too_long.json()["word_count"] == 8001
    assert calls == []


def test_chrome_limit_copy_never_promises_a_larger_or_unlimited_route(
        client, monkeypatch):
    calls = []
    monkeypatch.setattr(service, "_score_document",
                        lambda text: calls.append(text) or fake_score(text))
    too_large_text = "x" * 50001
    request_id = "req_chromelimitcopytest"
    _challenge, _nonce, token = issue_chrome(
        client, text=too_large_text, request=request_id)
    response = client.post(
        "/v1/chrome/check",
        json=chrome_check_body(text=too_large_text, request=request_id),
        headers=chrome_headers(token=token))
    assert response.status_code == 413
    payload = response.json()
    assert payload["max_chars"] == 50000
    assert payload["fallback"]["mode"] == "chrome-on-device"
    assert "no length limit" not in payload["message"]
    assert "100,000" not in payload["message"]
    assert "truncated" in payload["message"]
    assert calls == []


def test_streamed_body_limit_does_not_trust_content_length(client, monkeypatch):
    calls = []
    marker = b"PRIVATE-OVERSIZE-STREAM-MARKER"
    monkeypatch.setattr(service, "_score_document",
                        lambda text: calls.append(text) or fake_score(text))

    def oversized_chunks():
        yield b'{"text":"' + marker
        yield b"x" * service.MAX_BODY_BYTES

    response = client.post(
        "/v1/chrome/check", content=oversized_chunks(),
        headers={"content-type": "application/json",
                 "content-length": "1", "origin": CHROME_ORIGIN})
    assert response.status_code == 413
    assert marker.decode("ascii") not in response.text
    assert response.json()["max_chars"] == 50000
    assert response.json()["max_body_bytes"] == service.MAX_BODY_BYTES
    assert response.json()["fallback"]["mode"] == "chrome-on-device"
    assert calls == []


def test_disabled_validation_and_internal_errors_are_content_free(
        client, monkeypatch):
    marker = "PRIVATE-DOCUMENT-MARKER-9f3c"
    malformed = client.post(
        "/v1/wordpress/challenge",
        json={**challenge_body(), "site_id": marker}, headers=wp_headers())
    assert malformed.status_code == 422
    assert marker not in malformed.text
    assert malformed.json()["fallback"]["mode"] == "wordpress-local"

    oversized = client.post(
        "/v1/wordpress/check",
        content=("{\"text\":\"" + marker + "\"}"),
        headers={**wp_headers(), "content-type": "application/json",
                 "content-length": str(service.MAX_BODY_BYTES + 1)})
    assert oversized.status_code == 413
    assert marker not in oversized.text
    assert oversized.json()["fallback"]["mode"] == "wordpress-local"

    # WordPress's default JSON representation uses a twelve-byte surrogate
    # pair for each supplementary-plane character. A valid 100,000-UTF-16-unit
    # document must get past the byte guard; validation may then reject this
    # deliberately incomplete request without ever invoking inference.
    unicode_document = "\U0001f600" * (service.MAX_CHARS // 2)
    encoded = json.dumps({"text": unicode_document}).encode("utf-8")
    assert 600_000 < len(encoded) < service.MAX_BODY_BYTES
    assert service.utf16_length(unicode_document) == service.MAX_CHARS
    unicode_boundary = client.post(
        "/v1/wordpress/check", content=encoded,
        headers={**wp_headers(), "content-type": "application/json"})
    assert unicode_boundary.status_code == 422
    assert unicode_document[:8] not in unicode_boundary.text

    monkeypatch.setattr(service, "ENABLE_WORDPRESS_CHANNEL", False)
    disabled = client.post(
        "/v1/wordpress/challenge", json=challenge_body(),
        headers=wp_headers())
    assert disabled.status_code == 503
    assert disabled.json()["error"] == "wordpress_channel_disabled"

    monkeypatch.setattr(service, "ENABLE_WORDPRESS_CHANNEL", True)
    _challenge, _nonce, token = issue(
        client, text=" ".join([marker] * 80), request=OTHER_REQUEST)
    monkeypatch.setattr(
        service, "_score_document",
        lambda _text: (_ for _ in ()).throw(RuntimeError(marker)))
    failed = client.post(
        "/v1/wordpress/check",
        json=check_body(text=" ".join([marker] * 80), request=OTHER_REQUEST),
        headers=wp_headers(token=token))
    assert failed.status_code == 500
    assert marker not in failed.text
    assert failed.json()["fallback"]["mode"] == "wordpress-local"


def test_scoped_limiter_is_atomic_and_firestore_create_is_single_use():
    limiter = service.WeightedLimiter([(60, 1)])
    assert limiter.consume_scoped([("per_ip", "ip"), ("per_site", "site")])[0]
    refused = limiter.consume_scoped(
        [("per_install", "fresh"), ("per_site", "site")])
    assert refused[0] is False
    # The fresh install was not charged when the later site scope refused.
    assert limiter.consume_scoped([("per_install", "fresh")])[0]

    full_ledger = service.SingleUseLedger("memory")
    expiry = int(time.time()) + 60
    full_ledger._spent = {str(index): expiry for index in range(100_000)}
    assert full_ledger.spend("token", "new", expiry) == "unavailable"

    scopes = service._wordpress_scopes(IP, service._network(IP), SITE, INSTALL)
    assert [scope for scope, _key in scopes] == [
        "per_connection", "per_ip", "per_site", "per_install"]
    for expected_scope, target_key in scopes:
        scoped = service.WeightedLimiter([(60, 1)])
        assert scoped.consume_scoped([(expected_scope, target_key)])[0]
        refusal = scoped.consume_scoped(scopes)
        assert refusal[0] is False
        assert refusal[3] == expected_scope

    class AlreadyExists(Exception):
        pass

    class FakeDocument:
        def __init__(self):
            self.created = False

        def create(self, _fields):
            if self.created:
                raise AlreadyExists()
            self.created = True

    class FakeCollection:
        document_value = FakeDocument()

        def document(self, _document_id):
            return self.document_value

    class FakeClient:
        collection_value = FakeCollection()

        def collection(self, _name):
            return self.collection_value

    fake_client = FakeClient()
    first_instance = service.SingleUseLedger("firestore", client=fake_client)
    second_instance = service.SingleUseLedger("firestore", client=fake_client)
    assert first_instance.spend(
        "token", "same", int(time.time()) + 60) == "accepted"
    assert second_instance.spend(
        "token", "same", int(time.time()) + 60) == "replayed"


# --- one site's share of the WordPress floor ---------------------------------
# The four in-process limiters already charge a per-site scope, but they die
# with the process and this service scales to zero. These ceilings live in the
# same shared store the channel's replay ledger uses, so a site that keeps
# coming back meets the same allowance rather than a fresh one.
class _Increment:
    def __init__(self, delta):
        self.delta = delta


class _FakeFirestore:
    Increment = _Increment


class _FakeDocument:
    def __init__(self, store, name):
        self._store, self._name = store, name

    def set(self, data, merge=False):
        current = self._store.setdefault(self._name, {})
        if not merge:
            current.clear()
        for key, value in data.items():
            current[key] = (int(current.get(key, 0)) + value.delta
                            if isinstance(value, _Increment) else value)

    def get(self):
        name, store = self._name, self._store

        class _Snapshot:
            exists = property(lambda self: name in store)

            def to_dict(self):
                return dict(store.get(name, {}))

        return _Snapshot()


class _FakeCollection:
    def __init__(self, store):
        self._store = store

    def document(self, name):
        return _FakeDocument(self._store, name)


class _FakeFirestoreClient:
    def __init__(self):
        self.store = {}

    def collection(self, _name):
        return _FakeCollection(self.store)


def _shared_meter(client, **kwargs):
    """A SiteQuota on an injected store, with the real Firestore code path."""
    meter = service.SiteQuota("firestore", client=client, **kwargs)
    meter._firestore = _FakeFirestore
    meter._degraded = False
    return meter


def score(client, text=TEXT, *, site=SITE, install=INSTALL, request=REQUEST,
          ip=IP):
    """One complete WordPress check, exactly as the plugin client runs it."""
    _challenge, _nonce, token = issue(
        client, text, site=site, install=install, request=request, ip=ip)
    return client.post(
        "/v1/wordpress/check",
        json=check_body(text, site=site, install=install, request=request),
        headers=wp_headers(ip, token))


def test_the_shipped_per_site_ceilings_are_600_a_day_and_60_an_hour(client):
    assert service.WP_SITE_INFERENCES_PER_DAY == 600
    assert service.WP_SITE_INFERENCES_PER_HOUR == 60
    advertised = client.get("/v1/status").json()["wordpress_channel"]["per_site"]
    assert advertised["per_site_inferences_per_day"] == 600
    assert advertised["per_site_inferences_per_hour"] == 60
    assert advertised["windows"] == "utc-aligned"


def test_a_site_is_refused_by_its_hourly_ceiling_with_a_retry_after(client):
    service.WP_SITE_QUOTA = service.SiteQuota(
        "memory", per_day=1000, per_hour=3)
    for _ in range(3):
        assert score(client).status_code == 200
    response = score(client)
    assert response.status_code == 429
    payload = response.json()
    assert payload["error"] == "rate_limited"
    assert payload["scope"] == "per_site"
    assert payload["window"] == "hour"
    assert payload["reason"] == "site_allowance_exhausted"
    assert payload["unit"] == "inferences"
    assert 1 <= payload["retry_after"] <= 3600
    assert response.headers["retry-after"] == str(payload["retry_after"])
    # Honest, and it never claims the trained model ran.
    assert payload["processed"] == "none"
    assert payload["retained"] == "nothing"
    assert payload["fallback"] == service.WORDPRESS_FALLBACK
    assert "resets on the hour" in payload["message"]


def test_a_site_is_refused_by_its_daily_ceiling_with_a_retry_after(client):
    service.WP_SITE_QUOTA = service.SiteQuota(
        "memory", per_day=2, per_hour=1000)
    for _ in range(2):
        assert score(client).status_code == 200
    response = score(client)
    assert response.status_code == 429
    payload = response.json()
    assert payload["window"] == "day"
    assert 1 <= payload["retry_after"] <= 86400
    assert "00:00 UTC" in payload["message"]
    assert payload["fallback"] == service.WORDPRESS_FALLBACK


def test_one_site_cannot_spend_another_sites_allowance(client):
    service.WP_SITE_QUOTA = service.SiteQuota(
        "memory", per_day=1000, per_hour=2)
    for _ in range(2):
        assert score(client, site=SITE).status_code == 200
    assert score(client, site=SITE).status_code == 429
    # A different site, same connection, same install shape: unaffected.
    assert score(client, site=OTHER_SITE).status_code == 200


def test_the_per_site_counter_survives_the_instance_that_wrote_it():
    """The whole reason this is not just another in-process limiter."""
    store = _FakeFirestoreClient()
    ceiling = service.WP_SITE_FLUSH_EVERY      # so one flush covers the ceiling
    first = _shared_meter(store, per_day=ceiling, per_hour=1000)
    for _ in range(ceiling):
        assert first.reserve(SITE, 1)[0]
    # The instance is replaced. A fresh one reads the shared figure and refuses.
    second = _shared_meter(store, per_day=ceiling, per_hour=1000)
    allowed, window, retry_after, _day, _hour = second.reserve(SITE, 1)
    assert not allowed
    assert window == "day"
    assert retry_after >= 1


def test_the_per_site_counter_rolls_over_with_the_hour_and_the_day(monkeypatch):
    meter = service.SiteQuota("memory", per_day=4, per_hour=2)
    monkeypatch.setattr(service, "_utc_day", lambda: "2026-09-03")
    monkeypatch.setattr(service, "_utc_hour", lambda: "2026-09-03T09")
    assert meter.reserve(SITE, 2)[0]
    assert not meter.reserve(SITE, 1)[0]

    monkeypatch.setattr(service, "_utc_hour", lambda: "2026-09-03T10")
    assert meter.reserve(SITE, 2)[0]          # the hour rolled, the day did not
    allowed, window, _retry, _day, _hour = meter.reserve(SITE, 1)
    assert not allowed and window == "day"

    monkeypatch.setattr(service, "_utc_day", lambda: "2026-09-04")
    monkeypatch.setattr(service, "_utc_hour", lambda: "2026-09-04T00")
    assert meter.reserve(SITE, 2)[0]


def test_the_per_site_ceiling_writes_only_counts_and_an_expiry():
    store = _FakeFirestoreClient()
    meter = _shared_meter(store, per_day=100, per_hour=100)
    for _ in range(service.WP_SITE_FLUSH_EVERY + 1):
        assert meter.reserve(SITE, 1)[0]
    assert store.store, "nothing was written"
    for name, document in store.store.items():
        # The document name is a hash of an identifier that is itself a hash of
        # the site origin. Neither it nor any field carries request content.
        assert SITE not in name
        assert SITE.split(":", 1)[1] not in name
        for key, value in document.items():
            assert key == "count" or key == "expires_at" or (
                key.startswith("h") and len(key) == 3), key
            assert isinstance(value, (int, datetime))


def test_a_wordpress_floor_refusal_says_which_ceiling_refused_it(client):
    class FloorExhausted:
        def reserve(self, cost, channel=None):
            return False, 0, 43200, 43200, "channel_floor_exhausted"

    service.QUOTA = FloorExhausted()
    response = score(client)
    assert response.status_code == 429
    payload = response.json()
    assert payload["error"] == "daily_allowance_exhausted"
    assert payload["reason"] == "channel_floor_exhausted"
    assert payload["scope"] == "channel"
    assert payload["channel_bucket"] == "wordpress"
    assert payload["fallback"] == service.WORDPRESS_FALLBACK
    # A floor is a midnight fact. It must not be described as refilling.
    assert "refills continuously" not in payload["message"]
    assert "00:00 UTC" in payload["message"]
    assert "local integrity" in payload["message"]
