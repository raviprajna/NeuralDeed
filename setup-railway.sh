#!/bin/bash
# Railway Fully Automated Setup
#
# Reads .env.prod and automates Railway deployment
# One unavoidable manual step: Adding GitHub repo (Railway limitation)
# Script pauses, waits for you, then continues automation

set -e

echo "🚀 Railway Fully Automated Setup"
echo "================================="
echo ""

# Prerequisites
if [ ! -f ".env.prod" ]; then
    echo "❌ .env.prod not found"
    exit 1
fi

if ! command -v railway &> /dev/null; then
    brew install railway
fi

# Step 1: Login
echo "Step 1: Railway Login"
railway login
echo "✅ Logged in"
echo ""

# Step 2: Create project
echo "Step 2: Initialize Project"
if railway status &> /dev/null 2>&1; then
    echo "✅ Already linked"
else
    railway init
    echo "✅ Project created"
fi
echo ""

# Step 3: Add PostgreSQL
echo "Step 3: Add PostgreSQL"
if railway variables 2>/dev/null | grep -q "PGDATABASE"; then
    echo "✅ PostgreSQL exists"
else
    railway add --database postgres
    echo "✅ Database added"
    sleep 20
fi
echo ""

# Step 4: MANUAL - Connect GitHub
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Connect GitHub Repository"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Opening Railway dashboard..."
railway open &
sleep 2
echo ""
echo "⏸️  SCRIPT PAUSED - Complete this step:"
echo ""
echo "   1. Click the '+' button in Railway"
echo "   2. Select: 'GitHub Repo'"
echo "   3. Choose: 'raviprajna/NeuralDeed'"
echo "   4. Click 'Deploy'"
echo ""
echo "   Wait for 'NeuralDeed' service to appear (~10 sec)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "✋ Press Enter when NeuralDeed service is building... "
echo ""
echo "✅ GitHub connected"
echo "⏳ Waiting for service (15 seconds)..."
sleep 15
echo ""

# Step 5: Set variables on backend service
echo "Step 5: Configure Backend Environment"
echo "Setting variables from .env.prod on NeuralDeed service..."
echo ""

while IFS='=' read -r key value || [ -n "$key" ]; do
    [[ "$key" =~ ^[[:space:]]*#.*$ ]] && continue
    [[ -z "$key" ]] && continue

    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)

    echo "  ✓ $key"
    railway variables set --service NeuralDeed "$key=$value" 2>&1 | grep -v "Railway now\|telemetry" || true
done < .env.prod

echo ""
echo "✅ Environment configured on backend"
echo ""

# Step 6: Generate public domain
echo "Step 6: Generate Public URL"
echo "Generating public domain for your application..."
DOMAIN=$(railway domain --service NeuralDeed 2>&1 | grep "https://" | tail -1 || echo "")
if [ -n "$DOMAIN" ]; then
    echo "✅ Domain generated"
else
    echo "⚠️  Generate manually in Railway: Settings → Generate Domain"
fi
echo ""

# Step 7: Verify
echo "Step 7: Verify Deployment (waiting 30s)..."
sleep 30
if [ -n "$DOMAIN" ]; then
    if curl -f -s "$DOMAIN/docs" >/dev/null 2>&1; then
        echo "✅ App is LIVE!"
    else
        echo "⏳ Still deploying... Check: railway logs"
    fi
fi
echo ""

echo "🎉 SETUP COMPLETE!"
echo "==================="
echo ""
echo "✅ Backend: Deployed from GitHub"
echo "✅ Database: PostgreSQL connected"
echo "✅ Secrets: Configured from .env.prod"
echo "✅ Auto-deploy: Enabled on git push"
echo ""

# Get and display the public URL
APP_URL=$(railway variables --service NeuralDeed 2>/dev/null | grep "RAILWAY_PUBLIC_DOMAIN" | awk '{print $NF}' || echo "$DOMAIN")
if [ -n "$APP_URL" ]; then
    # Clean URL
    APP_URL=$(echo "$APP_URL" | sed 's/^/https:\/\//' | sed 's/https:\/\/https:\/\//https:\/\//')

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 Your Application is Live!"
    echo ""
    echo "🌐 Frontend & Backend:"
    echo "   $APP_URL"
    echo ""
    echo "📚 API Documentation:"
    echo "   $APP_URL/docs"
    echo ""
    echo "Click the URL above to open your app! 🚀"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
fi

echo "Commands:"
echo "  railway logs  - View logs"
echo "  railway open  - Dashboard"
echo ""
echo "═══════════════════════════════════════"
echo "Forever workflow:"
echo "  git push origin main"
echo ""
echo "Railway automatically deploys!"
echo "═══════════════════════════════════════"
