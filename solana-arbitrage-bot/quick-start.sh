#!/bin/bash

echo "======================================"
echo "Solana Arbitrage Bot - Quick Start"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env file and add your wallet private key"
    echo "   nano .env"
    echo ""
    read -p "Press Enter after you've configured .env file..."
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Create logs directory
mkdir -p logs

# Build TypeScript
echo "Building TypeScript files..."
npm run build

echo ""
echo "======================================"
echo "Bot is ready to start!"
echo "======================================"
echo ""
echo "Available commands:"
echo "  npm start    - Start the bot in production mode"
echo "  npm run dev  - Start the bot in development mode"
echo "  npm run monitor - Start with dashboard"
echo ""
echo "⚠️  SAFETY REMINDERS:"
echo "  1. Start with small amounts for testing"
echo "  2. Monitor the bot actively"
echo "  3. Never share your private key"
echo "  4. Set conservative risk limits"
echo ""
echo "Press Ctrl+C to stop the bot at any time"
echo ""
read -p "Start the bot now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run monitor
fi