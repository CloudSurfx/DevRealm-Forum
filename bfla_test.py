#!/usr/bin/env python3
"""
BFLA Test Script for DevRealms Forum (Supabase)
Tests Broken Function Level Authorization against the admin RPC functions.
"""

import os
import sys
import json
import requests
from typing import Dict, Any, Optional

# Load environment
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not ANON_KEY:
    print("ERROR: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env")
    sys.exit(1)

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def print_result(test_name: str, success: bool, details: str = ""):
    status = "✓ PASS" if success else "✗ FAIL"
    print(f"  {status} {test_name}")
    if details:
        print(f"    {details}")

def test_rpc_call(function_name: str, payload: Dict, auth_token: Optional[str] = None) -> Dict:
    """Call a Supabase RPC function."""
    headers = HEADERS.copy()
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    url = f"{SUPABASE_URL}/rest/v1/rpc/{function_name}"
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        return {
            "status_code": resp.status_code,
            "data": resp.json() if resp.text else None,
            "error": resp.text
        }
    except Exception as e:
        return {"status_code": 0, "data": None, "error": str(e)}

def test_table_access(table: str, method: str = "GET", auth_token: Optional[str] = None, payload: Dict = None) -> Dict:
    """Test direct table access via PostgREST."""
    headers = HEADERS.copy()
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    url = f"{SUPABASE_URL}/rest/v1/{table}"
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            resp = requests.post(url, headers=headers, json=payload, timeout=10)
        elif method == "PATCH":
            resp = requests.patch(url, headers=headers, json=payload, timeout=10)
        elif method == "DELETE":
            resp = requests.delete(url, headers=headers, timeout=10)
        else:
            return {"status_code": 0, "error": "Invalid method"}
        return {
            "status_code": resp.status_code,
            "data": resp.json() if resp.text else None,
            "error": resp.text
        }
    except Exception as e:
        return {"status_code": 0, "error": str(e)}

def sign_in(email: str, password: str) -> Optional[str]:
    """Sign in and return access token."""
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {"apikey": ANON_KEY, "Content-Type": "application/json"}
    resp = requests.post(url, headers=headers, json={"email": email, "password": password}, timeout=10)
    if resp.status_code == 200:
        return resp.json().get("access_token")
    return None

def sign_up(email: str, password: str, name: str) -> Optional[str]:
    """Sign up and return access token."""
    url = f"{SUPABASE_URL}/auth/v1/signup"
    headers = {"apikey": ANON_KEY, "Content-Type": "application/json"}
    resp = requests.post(url, headers=headers, json={
        "email": email,
        "password": password,
        "data": {"full_name": name, "user_name": name.lower().replace(" ", "_")}
    }, timeout=10)
    if resp.status_code == 200:
        return resp.json().get("access_token")
    return None

print("=" * 60)
print("BFLA Test Suite - DevRealms Forum (Supabase)")
print("=" * 60)
print(f"Target: {SUPABASE_URL}")
print()

# ============================================================
# PHASE 1: Test Admin RPC Functions with Regular User
# ============================================================
print("PHASE 1: Admin RPC Function Access Control")
print("-" * 40)

# Create a regular test user
test_email = f"bfla_test_{os.urandom(4).hex()}@example.com"
test_password = "TestPass123!"
print(f"Creating test user: {test_email}")

# Sign up
token = sign_up(test_email, test_password, "BFLA Test User")
if not token:
    print("  ✗ FAIL Could not create test user")
    sys.exit(1)

print(f"  ✓ Created user, got token: {token[:20]}...")

# Test admin RPC functions that should require admin role
admin_rpc_tests = [
    # (function_name, payload, description)
    ("admin_get_reports", {"status_filter": "open", "limit": 10}, "Get reports (admin only)"),
    ("admin_get_settings", {"category": "Algemeen"}, "Get settings (admin only)"),
    ("admin_update_setting", {"key": "site_name", "value": "Hacked"}, "Update setting (admin only)"),
    ("admin_activity", {"days": 7}, "Get activity stats (moderator+)"),
    ("admin_update_member", {"target_user_id": "00000000-0000-0000-0000-000000000000", "new_reputation": 9999, "new_badges": ["hacker"]}, "Update member reputation (admin only)"),
    ("admin_get_warnings", {"target_user_id": "00000000-0000-0000-0000-000000000000"}, "Get warnings (admin only)"),
    ("admin_add_warning", {"target_user_id": "00000000-0000-0000-0000-000000000000", "reason": "test", "severity": "low", "expires_days": 7}, "Add warning (admin only)"),
    ("admin_resolve_report", {"report_id": "00000000-0000-0000-0000-000000000000", "resolution": "test", "dismiss": True}, "Resolve report (admin only)"),
]

print("\nTesting admin RPC functions with REGULAR USER token:")
for func_name, payload, desc in admin_rpc_tests:
    result = test_rpc_call(func_name, payload, token)
    # Should return 401/403 or error about not being admin
    is_blocked = result["status_code"] in (401, 403) or (
        result["status_code"] == 200 and result["data"] and
        isinstance(result["data"], dict) and "exception" in str(result["data"]).lower()
    ) or (
        result["error"] and ("admin" in result["error"].lower() or "not allowed" in result["error"].lower() or "permission" in result["error"].lower())
    )
    print_result(f"{func_name} - {desc}", is_blocked,
                 f"Status: {result['status_code']}" + (f", Error: {result['error'][:100]}" if result['error'] and not is_blocked else ""))

# ============================================================
# PHASE 2: Test Direct Table Access (RLS Policies)
# ============================================================
print("\n" + "=" * 60)
print("PHASE 2: Direct Table Access via PostgREST (RLS)")
print("-" * 40)

# Tables that should be admin/moderator only for write
sensitive_tables = [
    ("user_roles", "GET", None, "Read user roles (should see own only)"),
    ("user_roles", "POST", {"user_id": "00000000-0000-0000-0000-000000000000", "role": "admin"}, "Insert admin role (admin only)"),
    ("moderation_actions", "GET", None, "Read moderation log (moderator+)"),
    ("moderation_actions", "POST", {"moderator_id": "00000000-0000-0000-0000-000000000000", "action": "delete", "target_table": "profiles", "target_id": "test"}, "Write moderation log (moderator+)"),
    ("member_bans", "GET", None, "Read bans (moderator+)"),
    ("member_bans", "POST", {"user_id": "00000000-0000-0000-0000-000000000000", "reason": "test"}, "Create ban (moderator+)"),
    ("site_settings", "GET", None, "Read settings (admin only - no policy, RPC only)"),
    ("site_settings", "POST", {"key": "test", "value": "test"}, "Write settings (admin only)"),
    ("polls", "POST", {"question": "test", "active": True}, "Create poll (admin only)"),
    ("poll_options", "POST", {"poll_id": "00000000-0000-0000-0000-000000000000", "label": "test"}, "Create poll option (admin only)"),
]

print("\nTesting direct table access with REGULAR USER token:")
for table, method, payload, desc in sensitive_tables:
    result = test_table_access(table, method, token, payload)
    # RLS should block unauthorized access
    is_blocked = result["status_code"] in (401, 403) or result["status_code"] >= 400
    print_result(f"{method} {table} - {desc}", is_blocked,
                 f"Status: {result['status_code']}" + (f", Data: {str(result['data'])[:80]}" if result['data'] and not is_blocked else ""))

# ============================================================
# PHASE 3: Test Profile Self-Update with Role Injection
# ============================================================
print("\n" + "=" * 60)
print("PHASE 3: Profile Self-Update - Role/Privilege Injection")
print("-" * 40)

# Get current user ID
me_result = test_rpc_call("admin_get_settings", {}, token)  # dummy to get user info
# Actually get profile
profile_result = test_table_access("profiles", "GET", token)
if profile_result["data"] and len(profile_result["data"]) > 0:
    user_id = profile_result["data"][0].get("id")
    print(f"  Current user ID: {user_id}")

    # Try to update profile with role injection
    injection_tests = [
        ({"role": "admin"}, "role field injection"),
        ({"is_admin": True}, "is_admin field injection"),
        ({"isAdmin": True}, "isAdmin field injection"),
        ({"user_roles": [{"role": "admin"}]}, "nested user_roles injection"),
    ]

    for patch, desc in injection_tests:
        result = test_table_access("profiles", "PATCH", token, {**patch, "id": f"eq.{user_id}"})
        # Should only allow safe fields per RLS policy
        is_blocked = result["status_code"] in (401, 403) or result["status_code"] >= 400
        print_result(f"PATCH profiles - {desc}", is_blocked,
                     f"Status: {result['status_code']}")
else:
    print("  ✗ Could not fetch profile")

# ============================================================
# PHASE 4: Test award_reputation (should allow self, block others)
# ============================================================
print("\n" + "=" * 60)
print("PHASE 4: award_reputation Function - Self vs Others")
print("-" * 40)

# Test self-award (should work)
result = test_rpc_call("award_reputation", {"target_user_id": user_id, "delta": 5}, token)
self_allowed = result["status_code"] == 200
print_result("award_reputation - Self award (should allow)", self_allowed, f"Status: {result['status_code']}")

# Test awarding to another user (should fail for regular user)
fake_user = "00000000-0000-0000-0000-000000000001"
result = test_rpc_call("award_reputation", {"target_user_id": fake_user, "delta": 5}, token)
others_blocked = result["status_code"] in (401, 403) or result["status_code"] >= 400
print_result("award_reputation - Award to other (should block)", others_blocked, f"Status: {result['status_code']}")

# ============================================================
# PHASE 5: Test with Unauthenticated Access
# ============================================================
print("\n" + "=" * 60)
print("PHASE 5: Unauthenticated Access to Admin Functions")
print("-" * 40)

print("\nTesting admin RPC functions WITHOUT authentication:")
for func_name, payload, desc in admin_rpc_tests[:4]:  # Test first 4
    result = test_rpc_call(func_name, payload, None)  # No token
    is_blocked = result["status_code"] in (401, 403) or result["status_code"] >= 400
    print_result(f"{func_name} (no auth) - {desc}", is_blocked,
                 f"Status: {result['status_code']}")

# ============================================================
# PHASE 6: Test SQL Injection in RPC Parameters
# ============================================================
print("\n" + "=" * 60)
print("PHASE 6: Parameter Injection / SQL Injection Attempts")
print("-" * 40)

# Test if RPC parameters are properly sanitized
injection_payloads = [
    ("admin_get_reports", {"status_filter": "open'; DROP TABLE reports; --", "limit": 10}, "SQL injection in status_filter"),
    ("admin_get_settings", {"category": "Algemeen' OR '1'='1"}, "SQL injection in category"),
    ("admin_activity", {"days": "14; DELETE FROM profiles; --"}, "SQL injection in days"),
]

print("\nTesting parameter injection:")
for func_name, payload, desc in injection_payloads:
    result = test_rpc_call(func_name, payload, token)
    # Should either fail validation or safely handle
    is_safe = result["status_code"] in (400, 401, 403) or (result["status_code"] == 200 and result["data"] is not None)
    print_result(f"{func_name} - {desc}", is_safe,
                 f"Status: {result['status_code']}")

# ============================================================
# SUMMARY
# ============================================================
print("\n" + "=" * 60)
print("BFLA TEST SUMMARY")
print("=" * 60)
print("""
This application uses Supabase with:
- Row Level Security (RLS) policies on all tables
- SECURITY DEFINER RPC functions with private.has_role() checks
- Authorization enforced at DATABASE LEVEL, not API gateway

Key findings to verify:
1. Admin RPC functions (admin_*) should reject regular users
2. RLS policies should block direct table access for unauthorized roles
3. award_reputation should allow self, block others for non-moderators
4. Profile updates should only allow safe fields (not role)
5. Unauthenticated requests should be blocked

If any test shows "✗ FAIL", that indicates a potential BFLA vulnerability
that should be investigated and fixed in the database policies/functions.
""")

print("Test completed. Check results above for any ✗ FAIL findings.")