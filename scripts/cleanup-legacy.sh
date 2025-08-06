#!/bin/bash

echo "🧹 Cleaning up legacy test directory..."

# Backup testOld directory before removal
if [ -d "testOld" ]; then
    echo "📦 Creating backup of testOld directory..."
    tar -czf "testOld-backup-$(date +%Y%m%d-%H%M%S).tar.gz" testOld/
    echo "✅ Backup created successfully"
    
    echo "🗑️  Removing testOld directory..."
    rm -rf testOld/
    echo "✅ testOld directory removed"
else
    echo "ℹ️  testOld directory not found, skipping cleanup"
fi

# Remove duplicate folder from client-web
if [ -d "client-web/src/duplicate" ]; then
    echo "🗑️  Removing duplicate GraphQL files from client-web..."
    rm -rf client-web/src/duplicate/
    echo "✅ Duplicate folder removed from client-web"
fi

# Clean up error logs
echo "🧹 Cleaning up error logs..."
find . -name "*.log" -type f -delete
find . -name "error.log" -type f -delete
echo "✅ Error logs cleaned up"

# Clean up generated files
echo "🧹 Cleaning up generated files..."
find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null
find . -name "coverage" -type d -exec rm -rf {} + 2>/dev/null
find . -name "html-report" -type d -exec rm -rf {} + 2>/dev/null
echo "✅ Generated files cleaned up"

echo "🎉 Cleanup completed successfully!"
