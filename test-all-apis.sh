#!/bin/bash
# ==============================================================================
#  RentPi – Complete Comprehensive API Test Suite (Direct Service Ports)
#  Run from Git Bash / WSL / Linux terminal
# ==============================================================================

set -uo pipefail
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

execute() {
    local desc="$1" method="$2" url="$3" data="${4:-}" auth="${5:-}"
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
echo "RentPi Comprehensive API Test Suite"
echo "Testing ALL features of all microservices with valid parameters."
hr

# ─────────────────────────────────────────────────────────────
# 1. Gateway Status
# ─────────────────────────────────────────────────────────────
execute "Gateway Health" GET "$BASE:8000/status"

# ─────────────────────────────────────────────────────────────
# 2. user-service (port 8001)
# ─────────────────────────────────────────────────────────────
info "────── User Service (8001) ──────"

execute "User Health" GET "$BASE:8001/status"

RANDOM_NUM=$RANDOM
USER_EMAIL="tester${RANDOM_NUM}@rentpi.com"
REGISTER_DATA="{\"name\":\"TestUser\",\"email\":\"$USER_EMAIL\",\"password\":\"Pass1234\"}"

execute "Register User" POST "$BASE:8001/users/register" "$REGISTER_DATA"

LOGIN_DATA="{\"email\":\"$USER_EMAIL\",\"password\":\"Pass1234\"}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE:8001/users/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_DATA")
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [[ -z "$TOKEN" ]]; then
    fail "Could not extract JWT token – registration or login failed"
else
    pass "Obtained JWT token (first 20 chars): ${TOKEN:0:20}..."
fi
echo ""

execute "Get Current User" GET "$BASE:8001/users/me" "" "$TOKEN"

# Extract the user ID from the user object
USER_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2 | head -n1)
if [[ -z "$USER_ID" ]]; then USER_ID=1; fi

execute "Get Discount (user $USER_ID)" GET "$BASE:8001/users/$USER_ID/discount"

# ─────────────────────────────────────────────────────────────
# 3. rental-service (port 8002)
# ─────────────────────────────────────────────────────────────
info "────── Rental Service (8002) ──────"

execute "Rental Health" GET "$BASE:8002/status"

execute "Get All Products" GET "$BASE:8002/rentals/products"

PRODUCT_ID=1
execute "Get Product by ID" GET "$BASE:8002/rentals/products/$PRODUCT_ID"

execute "Get Product Availability (2024)" GET "$BASE:8002/rentals/products/$PRODUCT_ID/availability?from=2024-01-01&to=2024-12-31"

execute "Get Kth Busiest Date (2024)" GET "$BASE:8002/rentals/kth-busiest-date?from=2024-01&to=2024-12&k=1"

execute "Get Top Categories for User" GET "$BASE:8002/rentals/users/$USER_ID/top-categories"

execute "Get Longest Free Streak for Product (2024)" GET "$BASE:8002/rentals/products/$PRODUCT_ID/free-streak?year=2024"

execute "Get Merged Feed (Products 1,2,3)" GET "$BASE:8002/rentals/merged-feed?productIds=1,2,3"

# ─────────────────────────────────────────────────────────────
# 4. analytics-service (port 8003)
# ─────────────────────────────────────────────────────────────
info "────── Analytics Service (8003) ──────"

execute "Analytics Health" GET "$BASE:8003/status"

execute "Get Peak Window (2024)" GET "$BASE:8003/analytics/peak-window?from=2024-01&to=2024-12"

execute "Get Surge Days (May 2024)" GET "$BASE:8003/analytics/surge-days?month=2024-05"

execute "Get Recommendations (May 2024)" GET "$BASE:8003/analytics/recommendations?date=2024-05-01&limit=5"

# ─────────────────────────────────────────────────────────────
# 5. agentic-service (port 8004)
# ─────────────────────────────────────────────────────────────
info "────── Agentic Service (8004) ──────"

execute "Agentic Health" GET "$BASE:8004/status"

CHAT_PAYLOAD="{\"message\":\"Tell me about rental prices and trending products.\",\"userId\":$USER_ID}"
CHAT_RESPONSE=$(curl -s -X POST "$BASE:8004/chat" \
    -H "Content-Type: application/json" \
    -d "$CHAT_PAYLOAD")

SESSION_ID=$(echo "$CHAT_RESPONSE" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)

if [[ -n "$SESSION_ID" ]]; then
    pass "Started Chat Session: $SESSION_ID"
    
    execute "Get Chat Sessions" GET "$BASE:8004/chat/sessions"

    execute "Get Chat History ($SESSION_ID)" GET "$BASE:8004/chat/$SESSION_ID/history"

    execute "Delete Chat Session ($SESSION_ID)" DELETE "$BASE:8004/chat/$SESSION_ID"
else
    fail "Could not extract sessionId from chat response"
    echo "   ↳ Response: $CHAT_RESPONSE"
fi

hr
echo -e "${CYAN}Complete comprehensive test suite finished.${NC}"
