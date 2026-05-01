#!/bin/bash
# ==============================================================================
#  RentPi – Complete API Test Suite (Direct Service Ports)
#  Run from Git Bash / WSL / Linux terminal
# ==============================================================================

set -euo pipefail
BASE="http://127.0.0.1"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✓ PASS${NC} – $1"; }
fail() { echo -e "${RED}✗ FAIL${NC} – $1"; }
info() { echo -e "${CYAN}→ $1${NC}"; }
hr()  { echo "───────────────────────────────────────────"; }

# Helper: send a request and display HTTP status + first line of body
execute() {
    local desc="$1" method="$2" url="$3" data="$4" auth="$5"
    info "$desc"
    local response
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
        -H "Content-Type: application/json" \
        ${auth:+-H "Authorization: Bearer $auth"} \
        ${data:+-d "$data"} 2>&1)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    if [[ "$http_code" == 2* || "$http_code" == 3* ]]; then
        pass "$desc  [HTTP $http_code]"
        # Only print body if it's not empty (to avoid blank lines)
        if [[ -n "$body" ]]; then
            echo "   ↳ Response: $body"
        fi
    else
        fail "$desc  [HTTP $http_code]"
        echo "   ↳ Response: $body"
    fi
    echo ""
}

hr
echo "RentPi API Test Suite"
echo "Services tested directly on their own ports (8001-8004)"
echo "Gateway /status also verified on port 8000"
hr

# ─────────────────────────────────────────────────────────────
# 1. Gateway status (the only gateway call that works reliably)
# ─────────────────────────────────────────────────────────────
execute "Gateway Health" \
        GET "$BASE:8000/status" "" ""

# ─────────────────────────────────────────────────────────────
# 2. user-service (port 8001)
#    Note: The user-service defines its routes as /users/...
#          but when accessed directly, the internal router
#          is mounted at /users. You must include /users in the path.
#          i.e., http://127.0.0.1:8001/users/register
# ─────────────────────────────────────────────────────────────

info "────── User Service (8001) ──────"

# Register a new user
REGISTER_DATA='{"name":"ApiTest","email":"apiuser@rentpi.com","password":"Test1234"}'
execute "Register User" \
        POST "$BASE:8001/users/register" "$REGISTER_DATA" ""

# Login (save the token)
LOGIN_DATA='{"email":"apiuser@rentpi.com","password":"Test1234"}'
LOGIN_RESPONSE=$(curl -s -X POST "$BASE:8001/users/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_DATA")
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [[ -z "$TOKEN" ]]; then
    fail "Could not extract JWT token – registration may have failed"
else
    pass "Obtained JWT token (first 20 chars): ${TOKEN:0:20}..."
fi
echo ""

# Get current user (/users/me)
execute "Get Current User" \
        GET "$BASE:8001/users/me" "" "$TOKEN"

# Get discount for user ID 1 (non‑authenticated)
execute "Get Discount (user 1)" \
        GET "$BASE:8001/users/1/discount" "" ""

# ─────────────────────────────────────────────────────────────
# 3. rental-service (port 8002)
#    You need to inspect its source to know exact routes.
#    We'll try common patterns – /status for health,
#    and likely /rentals for root.
# ─────────────────────────────────────────────────────────────
info "────── Rental Service (8002) ──────"

execute "Rental Health (/status)" \
        GET "$BASE:8002/status" "" ""

# Example: if the rental-service uses a router at /rentals,
# a GET to /rentals might list rentals (or 404 if no GET handler)
execute "Rental List (GET /rentals)" \
        GET "$BASE:8002/rentals" "" ""

# Replace with actual endpoint when known, e.g. POST /rentals
# execute "Create Rental" POST "$BASE:8002/rentals" '{"item":"bike"}' "$TOKEN"

# ─────────────────────────────────────────────────────────────
# 4. analytics-service (port 8003)
# ─────────────────────────────────────────────────────────────
info "────── Analytics Service (8003) ──────"

execute "Analytics Health (/status)" \
        GET "$BASE:8003/status" "" ""

# Try the root analytics route
execute "Analytics Root (GET /analytics)" \
        GET "$BASE:8003/analytics" "" ""

# ─────────────────────────────────────────────────────────────
# 5. agentic-service (port 8004)
#    This service likely handles chat (/chat)
# ─────────────────────────────────────────────────────────────
info "────── Agentic Service (8004) ──────"

execute "Agentic Health (/status)" \
        GET "$BASE:8004/status" "" ""

# If it exposes /chat/message etc., test it
execute "Agentic Root (GET /chat)" \
        GET "$BASE:8004/chat" "" ""

hr
echo -e "${CYAN}Test suite complete.${NC}"
echo "If any 404s appear, check the exact service routes in its source code."
echo "Gateway POST hang issue: bypass it by using direct service ports until proxy is fixed."