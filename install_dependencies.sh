#!/bin/bash

echo "🚀 Installing dependencies for Nadlan Deals Scraper..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "💡 Visit: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing npm packages..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "🎉 Ready to run the scraper!"
    echo ""
    echo "To test with a single settlement:"
    echo "  npm test"
    echo ""
    echo "To run the full scraper:"
    echo "  npm start"
    echo ""
else
    echo "❌ Failed to install dependencies"
    exit 1
fi










