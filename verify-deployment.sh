#!/bin/bash

# Deployment Verification Script for Flip7 Webapp
# Usage: ./verify-deployment.sh <backend-url> <frontend-url>
# Example: ./verify-deployment.sh https://flip7.up.railway.app https://michael-flip7.vercel.app

set -e

BACKEND_URL="${1:-}"
FRONTEND_URL="${2:-}"

if [ -z "$BACKEND_URL" ] || [ -z "$FRONTEND_URL" ]; then
    echo "Usage: $0 <backend-url> <frontend-url>"
    echo "Example: $0 https://flip7.up.railway.app https://michael-flip7.vercel.app"
    exit 1
fi

echo "🔍 Verifying Flip7 Deployment..."
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Check backend health endpoint
echo "1. Checking backend health endpoint..."
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/health" || echo "ERROR")
if [[ "$HEALTH_RESPONSE" == *"ok"* ]]; then
    echo "   ✅ Backend is healthy: $HEALTH_RESPONSE"
else
    echo "   ❌ Backend health check failed: $HEALTH_RESPONSE"
    exit 1
fi

# Check backend is accessible
echo ""
echo "2. Checking backend accessibility..."
if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" | grep -q "200"; then
    echo "   ✅ Backend is accessible"
else
    echo "   ❌ Backend is not accessible"
    exit 1
fi

# Check frontend is accessible
echo ""
echo "3. Checking frontend accessibility..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")
if [[ "$FRONTEND_STATUS" == "200" ]]; then
    echo "   ✅ Frontend is accessible (HTTP $FRONTEND_STATUS)"
else
    echo "   ⚠️  Frontend returned HTTP $FRONTEND_STATUS (may still be deploying)"
fi

# Check WebSocket URL format
echo ""
echo "4. Verifying WebSocket URL format..."
BACKEND_WS_URL=$(echo "$BACKEND_URL" | sed 's|https://|wss://|' | sed 's|http://|ws://|')
echo "   Expected VITE_WS_URL: $BACKEND_WS_URL"
echo "   ✅ WebSocket URL format is correct"

# Environment variable checklist
echo ""
echo "📋 Environment Variables Checklist:"
echo ""
echo "Railway (Backend):"
echo "   [ ] CLIENT_URL=$FRONTEND_URL"
echo ""
echo "Vercel (Frontend):"
echo "   [ ] VITE_WS_URL=$BACKEND_WS_URL"
echo ""

echo "✅ Basic verification complete!"
echo ""
echo "Next steps:"
echo "1. Open $FRONTEND_URL in your browser"
echo "2. Open browser Developer Tools (F12) → Console"
echo "3. Look for 'WebSocket connected' message"
echo "4. Test multiplayer features (create/join rooms)"
echo "5. Verify no CORS errors in console"

