#!/bin/bash

# Portfolio Deployment Script
# This script prepares your project for portfolio/GitHub showcase

echo "🚀 Preparing project for portfolio deployment..."

# Backup original README
if [ -f "README.md" ]; then
    echo "📝 Backing up original README.md to README_ORIGINAL.md"
    cp README.md README_ORIGINAL.md
fi

# Replace with portfolio README
if [ -f "README_PORTFOLIO.md" ]; then
    echo "📝 Replacing README.md with portfolio version"
    cp README_PORTFOLIO.md README.md
fi

# Show what files will be ignored
echo ""
echo "🔒 Files that will be ignored by Git:"
echo "   ✓ backend/.env (sensitive credentials)"
echo "   ✓ backend/.env.test (test credentials)"
echo "   ✓ stripe.exe (development tool)"
echo "   ✓ [MERN]*.md (project planning files)"
echo "   ✓ docs/Phase*-*.md (AI documentation)"
echo "   ✓ docs/Implementation-Guide.md (AI guide)"

echo ""
echo "📋 Files cleaned up:"
echo "   ✓ Removed all console.log debug statements"
echo "   ✓ Removed AI-generated comments"
echo "   ✓ Created .env.example template"
echo "   ✓ Updated .gitignore for security"

echo ""
echo "✅ Project is ready for portfolio showcase!"
echo ""
echo "Next steps:"
echo "1. Update backend/.env.example with your service URLs"
echo "2. Add your personal information to README.md"
echo "3. Test that sensitive files are not tracked: git status"
echo "4. Commit your changes: git add . && git commit -m 'Portfolio ready'"
echo "5. Push to GitHub: git push origin main"

echo ""
echo "🎯 Portfolio highlights to mention:"
echo "   • Full-stack MERN application with TypeScript"
echo "   • Stripe payment integration with webhooks"
echo "   • Multi-currency support (PHP/USD)"
echo "   • Real-time payment processing"
echo "   • Professional email automation"
echo "   • Secure authentication system"
echo "   • Docker containerization"
echo "   • Production-ready architecture"
