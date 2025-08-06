#!/bin/bash

echo "📦 Updating dependencies across all workspaces..."

# Update root dependencies
echo "🔄 Updating root dependencies..."
npm update

# Update workspace dependencies
echo "🔄 Updating lib dependencies..."
cd lib && npm update && cd ..

echo "🔄 Updating client-web dependencies..."
cd client-web && npm update && cd ..

echo "🔄 Updating server-api dependencies..."
cd server-api && npm update && cd ..

# Check for security vulnerabilities
echo "🔍 Checking for security vulnerabilities..."
npm audit --workspaces

# Check for outdated packages
echo "📊 Checking for outdated packages..."
npm outdated --workspaces

echo "✅ Dependency update completed!"

# Show summary
echo "📋 Summary:"
echo "- Root dependencies updated"
echo "- All workspace dependencies updated"
echo "- Security audit completed"
echo "- Outdated packages check completed"

echo ""
echo "💡 Next steps:"
echo "1. Review audit results and fix any security issues"
echo "2. Consider updating outdated packages manually if needed"
echo "3. Run tests to ensure everything still works"
