# Quick Finish Guide - Remaining Migration Work

## 🎯 What's Left: ~20 Minutes

All the **hard work is done**. The remaining updates are simple find/replace operations.

---

## 📝 Remaining Files (7 API Routes)

### **1. src/pages/api/canvas/[id].ts**
**Changes needed:**
```typescript
// Add imports at top:
import { successResponse, apiErrors } from '@/lib/utils/api-response';

// Find/Replace (in all 3 handlers: GET, PUT, DELETE):
canvas.user_id → canvas.userId
canvas.thumbnail_url → canvas.thumbnailUrl
canvas.is_public → canvas.isPublic
canvas.created_at → canvas.createdAt
canvas.updated_at → canvas.updated_at
canvas.r2_key → canvas.r2Key
canvas.size_bytes → canvas.sizeBytes

// Replace error responses:
new Response(JSON.stringify({ error: 'Canvas not found' ... }))
→ apiErrors.notFound('Canvas')

new Response(JSON.stringify({ error: 'Access denied' ... }))
→ apiErrors.forbidden('You do not have permission...')

// Replace success responses:
new Response(JSON.stringify(response), { status: 200, ... })
→ successResponse(response)

new Response(JSON.stringify(response), { status: 201, ... })
→ successResponse(response, 201)
```

### **2. src/pages/api/canvas/[id]/versions.ts**
**Changes needed:**
```typescript
// Add imports:
import { successResponse, apiErrors } from '@/lib/utils/api-response';

// Same find/replace as above for canvas properties
// Update error responses to use apiErrors.*
```

### **3. src/pages/api/canvas/[id]/thumbnail.ts**
**Changes needed:**
```typescript
canvas.user_id → canvas.userId
```

### **4. src/pages/api/canvas/public.ts**
**Changes needed:**
```typescript
canvas.user_id → canvas.userId
canvas.thumbnail_url → canvas.thumbnailUrl
canvas.created_at → canvas.createdAt
canvas.updated_at → canvas.updatedAt
```

### **5. src/pages/api/canvas/shared/[token].ts**
**Changes needed:** Same as #4

---

## 🎨 Component Files (Optional - Can do later)

These work fine with `any[]` but would benefit from proper types:

### **src/components/islands/ExcalidrawCanvas.tsx**
```typescript
// Add import:
import type { CanvasData } from '@/lib/types/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types';

// Replace:
const reconcileElements = (local: any[], remote: any[]) => { ... }

// With:
const reconcileElements = (
  local: readonly ExcalidrawElement[],
  remote: readonly ExcalidrawElement[]
) => { ... }
```

### **src/hooks/useAutoSave.ts**
```typescript
// Add import:
import type { CanvasData } from '@/lib/types/excalidraw';

// Replace:
let canvasData: any = { elements: [], appState: {}, files: null };

// With:
let canvasData: CanvasData = { elements: [], appState: {}, files: null };
```

---

## ⚡ Quick Regex Find/Replace (VS Code)

**Find:**
```regex
canvas\.(user_id|thumbnail_url|is_public|created_at|updated_at|r2_key|size_bytes)
```

**Replace:**
```
canvas.$1
```

Then manually convert snake_case to camelCase:
- user_id → userId
- thumbnail_url → thumbnailUrl
- is_public → isPublic
- created_at → createdAt
- updated_at → updatedAt
- r2_key → r2Key
- size_bytes → sizeBytes

---

## ✅ Testing Checklist

After making changes, run:

```bash
# 1. TypeScript check (should pass)
npx tsc --noEmit

# 2. Build check (should succeed)
npm run build

# 3. Manual testing
npm run dev

# Test these operations:
# - Create new canvas
# - Load existing canvas
# - Update canvas title
# - List canvases
# - Delete canvas
```

---

## 🎉 Done!

After these updates, you'll have:
- ✅ **100% type-safe database layer** (Drizzle)
- ✅ **Standardized API responses** (consistent errors & success)
- ✅ **Zero code duplication** (canvas naming, validation)
- ✅ **Proper type safety** (CanvasData, not any[])
- ✅ **Maintainable codebase** (DRY, typed, consistent)

**Total time to finish:** ~20 minutes of find/replace
**Long-term benefit:** Hours saved on every future feature

---

## 🆘 Need Help?

If you see TypeScript errors after the changes:

1. **Check imports** - Make sure all files import from the new utility files
2. **Check camelCase** - Drizzle returns camelCase, not snake_case
3. **Run the checker:** `./scripts/finish-migration.sh`
4. **Check this summary:** See `MIGRATION_SUMMARY.md` for full details

---

## 📚 Reference

**Utility Files Created:**
- `src/lib/utils/api-response.ts` - API response helpers
- `src/lib/utils/canvas-naming.ts` - Canvas naming logic
- `src/lib/utils/error-handling.ts` - Error classes
- `src/lib/types/excalidraw.ts` - Canvas types

**Updated Files:**
- `src/lib/db/schema.ts` - Fixed Drizzle schema
- `src/lib/db/index.ts` - Migrated to Drizzle ORM
- `src/lib/schemas/canvas.schema.ts` - Consolidated validation
- `src/lib/storage/canvas-storage.ts` - Uses new types
- `src/pages/api/canvas/create.ts` - ✅ Complete
- `src/pages/api/canvas/auto-save.ts` - ✅ Complete
- `src/pages/api/canvas/list.ts` - ✅ Complete
