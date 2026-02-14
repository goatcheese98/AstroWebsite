#!/bin/bash
# Migration Completion Helper
# This script helps identify remaining files that need updates

echo "🔍 Finding remaining snake_case property usages..."
echo ""

echo "📁 Files with canvas.user_id:"
grep -r "canvas\.user_id" src/pages/api/ src/components/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort -u

echo ""
echo "📁 Files with canvas.thumbnail_url:"
grep -r "canvas\.thumbnail_url" src/pages/api/ src/components/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort -u

echo ""
echo "📁 Files with canvas.is_public:"
grep -r "canvas\.is_public" src/pages/api/ src/components/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort -u

echo ""
echo "📁 Files with canvas.created_at:"
grep -r "canvas\.created_at" src/pages/api/ src/components/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort -u

echo ""
echo "📁 Files with canvas.r2_key:"
grep -r "canvas\.r2_key" src/pages/api/ src/components/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort -u

echo ""
echo "📁 Files with any[]: (needs CanvasData type)"
grep -r "any\[\]" src/components/islands/ src/hooks/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort -u

echo ""
echo "📁 Files still using old error responses:"
grep -r "new Response(JSON.stringify({ error:" src/pages/api/ --include="*.ts" | cut -d: -f1 | sort -u

echo ""
echo "✅ Migration Progress:"
echo "   - Foundation files: 100%"
echo "   - DB layer: 100%"
echo "   - Storage layer: 100%"
echo "   - API routes: ~80%"
echo "   - Components: 0%"
echo ""
echo "📋 Next steps:"
echo "   1. Update remaining API routes (src/pages/api/canvas/[id].ts, etc.)"
echo "   2. Update component types (ExcalidrawCanvas.tsx, CanvasApp.tsx)"
echo "   3. Run 'npx tsc --noEmit' to check for errors"
echo "   4. Test canvas operations"
