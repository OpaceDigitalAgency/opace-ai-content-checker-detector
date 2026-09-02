"""Pure protocol tests for the WordPress-specific one-shot credentials."""
from __future__ import annotations

import hashlib

import wordpress_channel as wp


SECRET = b"unit-test-server-secret-not-for-deployment"
NOW = 1_800_000_000
NETWORK = "bind-network-a"
SITE = "sha256:" + "a" * 64
INSTALL = "wp_abcdefghijklmnop"
REQUEST = "req_abcdefghijklmnop"
TEXT = "Measured text remains only in the score request body."
BODY = wp.body_sha256(TEXT)


def challenge():
    token, claims = wp.issue_challenge(
        SECRET, network=NETWORK, site_id=SITE, install_id=INSTALL,
        request_id=REQUEST, body_hash=BODY, ttl_seconds=120, now=NOW)
    nonce = wp.solve_challenge(token, 8)
    return token, claims, nonce


def score_token():
    token, _claims, nonce = challenge()
    verified, error = wp.verify_challenge(
        SECRET, token, network=NETWORK, nonce=nonce,
        difficulty_bits=8, now=NOW)
    assert error is None
    return wp.issue_score_token(SECRET, verified, ttl_seconds=120, now=NOW)


def test_exact_utf8_body_hash_and_claims_contain_no_source_text():
    assert wp.body_sha256("é") == "sha256:" + hashlib.sha256("é".encode()).hexdigest()
    token, claims, _nonce = challenge()
    assert TEXT not in token
    assert TEXT not in str(claims)
    assert claims["body_sha256"] == BODY
    assert claims["channel"] == wp.CHANNEL


def test_challenge_requires_real_work_and_exact_network_binding():
    token, _claims, nonce = challenge()
    assert wp.verify_challenge(SECRET, token, network=NETWORK, nonce=nonce,
                               difficulty_bits=8, now=NOW)[1] is None
    assert wp.verify_challenge(SECRET, token, network="other", nonce=nonce,
                               difficulty_bits=8, now=NOW)[1] == "challenge_not_yours"
    assert wp.verify_challenge(SECRET, token, network=NETWORK, nonce="wrong",
                               difficulty_bits=32, now=NOW)[1] == "insufficient_work"


def test_challenge_signature_expiry_and_future_issue_fail_closed():
    token, _claims, nonce = challenge()
    broken = token[:-1] + ("A" if token[-1] != "A" else "B")
    assert wp.verify_challenge(SECRET, broken, network=NETWORK, nonce=nonce,
                               difficulty_bits=8, now=NOW)[1] == "token_invalid"
    assert wp.verify_challenge(SECRET, token, network=NETWORK, nonce=nonce,
                               difficulty_bits=8, now=NOW + 120)[1] == "token_expired"
    assert wp.verify_challenge(SECRET, token, network=NETWORK, nonce=nonce,
                               difficulty_bits=8, now=NOW + 121)[1] == "token_expired"
    assert wp.verify_challenge(SECRET, token, network=NETWORK, nonce=nonce,
                               difficulty_bits=8, now=NOW - 6)[1] == "token_not_yet_valid"


def test_score_token_is_bound_to_site_install_request_body_and_network():
    token, _claims = score_token()
    base = dict(network=NETWORK, site_id=SITE, install_id=INSTALL,
                request_id=REQUEST, body_hash=BODY, now=NOW)
    assert wp.verify_score_token(SECRET, token, **base)[1] is None
    for field, value, error in (
        ("network", "other", "token_not_yours"),
        ("site_id", "sha256:" + "b" * 64, "token_wrong_site"),
        ("install_id", "wp_otherinstallidentifier", "token_wrong_install"),
        ("request_id", "req_otherrequestidentifier", "token_wrong_request"),
        ("body_hash", "sha256:" + "c" * 64, "token_wrong_body"),
    ):
        changed = {**base, field: value}
        assert wp.verify_score_token(SECRET, token, **changed)[1] == error


def test_channel_kinds_are_cryptographically_separate():
    challenge_token, _claims, _nonce = challenge()
    score, _claims = score_token()
    base = dict(network=NETWORK, site_id=SITE, install_id=INSTALL,
                request_id=REQUEST, body_hash=BODY, now=NOW)
    assert wp.verify_score_token(SECRET, challenge_token, **base)[1] == "token_invalid"
    assert wp.verify_challenge(SECRET, score, network=NETWORK, nonce="0",
                               difficulty_bits=0, now=NOW)[1] == "token_invalid"


def test_score_token_expiry_missing_and_malformed_fail_closed():
    token, _claims = score_token()
    base = dict(network=NETWORK, site_id=SITE, install_id=INSTALL,
                request_id=REQUEST, body_hash=BODY)
    assert wp.verify_score_token(SECRET, None, **base, now=NOW)[1] == "token_missing"
    assert wp.verify_score_token(SECRET, "not-a-token", **base,
                                 now=NOW)[1] == "token_malformed"
    assert wp.verify_score_token(SECRET, token, **base,
                                 now=NOW + 121)[1] == "token_expired"
