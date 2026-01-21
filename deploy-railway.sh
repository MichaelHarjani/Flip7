#!/bin/bash
# Railway Deployment Helper Script
# This script helps you link and deploy to Railway

echo "🚂 Railway Deployment Helper"
echo "============================"
echo ""
echo "Step 1: Link to your Railway project"
echo "Please run this command manually:"
echo ""
echo "  railway link"
echo ""
read -p "Have you linked to your Railway project? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please run 'railway link' first, then run this script again."
    exit 1
fi

echo ""
echo "Step 2: Deploy to Railway"
echo ""
railway up

echo ""
echo "Step 3: Get your Railway domain"
echo ""
RAILWAY_DOMAIN=$(railway domain 2>&1)
echo "Railway Domain: $RAILWAY_DOMAIN"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update client/.env.production with your Railway URL"
echo "2. Update Vercel environment variable VITE_WS_URL"
echo "3. Redeploy Vercel"
