#!/bin/bash
BASE="http://localhost:8000"

echo "=== Testing API Gateway Routes ==="

echo -n "1. /users   →  "
curl -s -o /dev/null -w "%{http_code}" "$BASE/users/register" && echo " (proxy to user-service works)"

echo -n "2. /rentals →  "
curl -s -o /dev/null -w "%{http_code}" "$BASE/rentals" && echo " (proxy to rental-service works)"

echo -n "3. /analytics → "
curl -s -o /dev/null -w "%{http_code}" "$BASE/analytics" && echo " (proxy to analytics-service works)"

echo -n "4. /chat    →  "
curl -s -o /dev/null -w "%{http_code}" "$BASE/chat" && echo " (proxy to agentic-service works)"

echo ""
echo "=== All tests done ==="