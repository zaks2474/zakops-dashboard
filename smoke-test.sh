#!/bin/bash
# ZakOps Dashboard Smoke Test
# Run this to verify all pages are working

set -e

BASE_URL="${BASE_URL:-http://localhost:3003}"

echo "=========================================="
echo "ZakOps Dashboard Smoke Test"
echo "Base URL: $BASE_URL"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

test_page() {
    local name="$1"
    local url="$2"
    local expected="${3:-200}"

    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$status" = "$expected" ]; then
        echo -e "${GREEN}✓${NC} $name ($url) - HTTP $status"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}✗${NC} $name ($url) - Expected $expected, got $status"
        FAIL=$((FAIL + 1))
    fi
}

echo "1. Testing Page Routes"
echo "----------------------"
test_page "Dashboard" "$BASE_URL/dashboard"
test_page "Deals List" "$BASE_URL/deals"
test_page "Deal Detail" "$BASE_URL/deals/DEAL-2025-001"
test_page "Actions" "$BASE_URL/actions"
test_page "Quarantine" "$BASE_URL/quarantine"

echo ""
echo "2. Testing API Proxy"
echo "--------------------"
test_page "API: Deals" "$BASE_URL/api/deals"
test_page "API: Deal Detail" "$BASE_URL/api/deals/DEAL-2025-001"
test_page "API: Actions" "$BASE_URL/api/deferred-actions"
test_page "API: Quarantine" "$BASE_URL/api/quarantine"
test_page "API: Quarantine Health" "$BASE_URL/api/quarantine/health"

echo ""
echo "3. Testing Filtered Routes"
echo "--------------------------"
test_page "Deals (filtered by stage)" "$BASE_URL/deals?stage=screening"
test_page "Deals (filtered by status)" "$BASE_URL/deals?status=active"

echo ""
echo "=========================================="
echo "Results: $PASS passed, $FAIL failed"
echo "=========================================="

if [ $FAIL -gt 0 ]; then
    exit 1
fi

echo ""
echo "All smoke tests passed!"
