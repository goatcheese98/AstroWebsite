# 🤖 AI Coding System Prompt - React/Astro Refactoring Protocol

> **Version:** 2.0  
> **Last Updated:** 2026-02-02  
> **Purpose:** Standardize AI-assisted code development for modular, maintainable React/Astro applications

---

## 🎯 Core Philosophy

**Every file is a person with a job.** Code should be self-documenting through personification. When refactoring, we don't just move code—we give it a new home with clear identity, relationships, and responsibilities.

---

## 📋 The "Personified File" Header Template

**EVERY** TypeScript/TSX file (except `.md`, `.svg`, `.json`) MUST begin with this comprehensive header:

```typescript
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                        [ICON] FileName.ts                                    ║
 * ║                    "The Personified Name"                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  🏷️ BADGES: [Color-coded responsibility badges]                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 👤 WHO AM I?
 * I am the [role]. I [primary responsibility]. When users [action], I'm the one
 * who [what you do]. I'm [adjective] by design because [reason].
 * 
 * 🎯 WHAT USER PROBLEM DO I SOLVE?
 * Users need to [user goal]. I ensure:
 * - [Specific benefit 1]
 * - [Specific benefit 2] 
 * - [Specific benefit 3]
 * 
 * 💬 WHO IS IN MY SOCIAL CIRCLE?
 * 
 *      ┌─────────────────────────────────────────────────────────────────┐
 *      │                        MY NEIGHBORS                              │
 *      ├─────────────────────────────────────────────────────────────────┤
 *      │                                                                  │
 *      │   [ASCII diagram showing component/hook relationships]          │
 *      │                                                                  │
 *      │   ┌─────────────┐      ┌──────────────┐      ┌─────────────┐   │
 *      │   │  Parent     │─────▶│      ME      │─────▶│   Child     │   │
 *      │   └─────────────┘      └──────┬───────┘      └─────────────┘   │
 *      │                               │                                │
 *      │                               ▼                                │
 *      │                  [Events I dispatch/listen to]                 │
 *      │                                                                  │
 *      └─────────────────────────────────────────────────────────────────┘
 * 
 * 🚨 IF I BREAK:
 * - **Symptoms:** [What users will see/experience]
 * - **User Impact:** [How it affects the user journey]
 * - **Quick Fix:** [Immediate remediation]
 * - **Debug:** [Where to look, what logs to check]
 * - **Common Issue:** [Frequent cause of failure]
 * 
 * 📦 [STATE/PROPS] I MANAGE:
 * ┌─────────────────────┬──────────────────────────────────────────────────────┐
 * │ [variable]          │ [Description of what this tracks]                    │
 * │ [variable]          │ [Description of what this tracks]                    │
 * └─────────────────────┴──────────────────────────────────────────────────────┘
 * 
 * 🎬 MAIN ACTIONS I PROVIDE:
 * - [actionName](): [Brief description]
 * - [actionName](): [Brief description]
 * 
 * 🔑 KEY CONCEPTS:
 * [Any important architectural decisions, patterns, or gotchas]
 * 
 * 📝 REFACTOR JOURNAL:
 * YYYY-MM-DD: [What changed and why]
 * YYYY-MM-DD: [What changed and why]
 * 
 * @module [module-name]
 */
```

---

## 🏷️ Color-Coded Responsibility Badges

Use these badges in the header to indicate file type:

| Badge | Meaning           | Use For                            |
| :---: | :---------------- | :--------------------------------- |
|   🟣  | UI Component      | React components that render DOM   |
|   🔵  | Custom Hook       | Logic extraction, state management |
|   🟢  | State Manager     | Complex state logic, data flow     |
|   🔴  | API Handler       | External API calls, data fetching  |
|   🟡  | Utility           | Helper functions, pure logic       |
|   ⚡  | Event Coordinator | Event listeners, dispatchers       |
|   ⚪  | Type Definition   | Interfaces, types, constants       |
|   🏗️  | Architecture Root | Main orchestrators, entry points   |
|   🎯  | Orchestrator      | Composes multiple hooks/components |

**Multiple badges allowed:** `🔵 Custom Hook | 🟢 State Manager | 🔴 API Handler`

---

## 🏛️ The "Clean Sweep" Architecture Rules

### 1. The 300-Line Soft Limit

**Aspirational Goal:** No code file should exceed 300 lines (excluding header).

### Practical Limits

- UI Components: 150-350 lines
- Custom Hooks: 200-450 lines (API integration is verbose)
- Utilities: <100 lines
- Orchestrators: <400 lines

### When to split

- Logic grows beyond 300 lines → Extract to custom hook
- UI grows beyond 300 lines → Extract to sub-component
- Constants clutter file → Move to `constants/` folder

### Exceptions allowed for

- Complex API integration logic
- Data-heavy configuration files
- Generated code

### 2. Logic Isolation Hierarchy

```text
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENT LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🎨 UI Components (components/*.tsx)                        │
│     └─ Only handle "looking good" and user interactions     │
│     └─ Call hook functions, don't implement logic           │
│                                                              │
│  🧠 Custom Hooks (hooks/*.ts)                               │
│     └─ Business logic and state management                  │
│     └─ API calls, data transformation, side effects         │
│     └─ Return state and actions for UI to consume           │
│                                                              │
│  🛠️ Utilities (lib/*.ts, utils/*.ts)                        │
│     └─ Pure functions, no React dependencies                │
│     └─ Data formatting, validation, calculations            │
│                                                              │
│  📚 Constants (constants/*.ts)                              │
│     └─ Static data, configuration, magic values             │
│     └─ Type-safe enums and lookup tables                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. The Refactor Protocol

**When extracting code from a monolith:**

1. ✅ **Preserve behavior** - Copy-paste first, modify second
2. ✅ **Move ALL related code** - Styles, types, constants, utilities
3. ✅ **Update imports immediately** - Don't leave broken references
4. ✅ **Update headers** - Both source and destination files
5. ✅ **Verify exports** - Update index.ts barrel files
6. ✅ **Test incrementally** - Build after each major extraction

**NEVER:**

- ❌ Leave dead code in source file
- ❌ Break event listener attachments
- ❌ Forget to move CSS-in-JS styles
- ❌ Lose TypeScript type information
- ❌ Skip updating the refactor journal

### 4. Modification Protocol

**Before finishing any response:**

1. Verify every file you touched
2. If a responsibility moved, update BOTH headers
3. Check that "My Neighbors" diagrams reflect new relationships
4. Ensure imports work (run TypeScript check)
5. Confirm no variables are left undefined

---

## 🎨 Creating New Components vs Refactoring

### When Creating New Components

### Step 1: Determine responsibility

- What user problem does this solve?
- What will it receive as props?
- What will it dispatch/return?

### Step 2: Choose location

```text
src/components/[feature]/
├── components/     ← UI components
├── hooks/          ← Custom hooks  
├── constants/      ← Static data
├── lib/            ← Utilities
├── types.ts        ← Shared types
└── index.ts        ← Public API
```

### Step 3: Write header first

- Use the **comprehensive template** for files >150 lines
- Use the **minimal template** for small utilities (<50 lines)
- Define relationships before writing code
- This acts as your specification

### Step 4: Implement with line limit in mind

- Stop at 250 lines, assess
- Extract early if growing

### When Refactoring (The "God Component" Surgery)

#### Phase 1: Analyze & Plan

- Read the entire monolith
- Identify state clusters (what changes together)
- Identify UI sections (what renders together)
- Map dependencies (who talks to whom)

#### Phase 2: Extract State (Custom Hooks)

1. Group related state variables
2. Extract to `use[Feature][Concern].ts`
3. Move handlers that modify that state
4. Keep UI-specific handlers in component

#### Phase 3: Extract UI (Components)

1. Identify visual sections
2. Extract to `[SectionName].tsx`
3. Pass props down, callbacks up
4. Preserve all CSS-in-JS styles

#### Phase 4: Clean Up Orchestrator

1. Component should be < 300 lines
2. Only compose hooks and components
3. Handle high-level coordination only

---

## ✅ Pre-Flight Checklist

Before declaring refactoring complete:

- [ ] All files under 300 lines (exceptions documented)
- [ ] Every file has comprehensive personified header
- [ ] No undefined variables in JSX
- [ ] TypeScript compiles without errors
- [ ] Build succeeds: `npm run build`
- [ ] No broken imports in index.ts
- [ ] Refactor journal entries added
- [ ] "My Neighbors" diagrams updated
- [ ] Color-coded badges applied correctly

---

## 🎓 Example: Complete Refactor Workflow

**Starting Point:** `AIChatContainer.tsx` (1,760 lines)

### Step 1: Extract hooks

- `useAIChatState.ts` - Core message state (419 lines)
- `useImageGeneration.ts` - Image generation (370 lines)
- `useCanvasCommands.ts` - Canvas operations (301 lines)
- `usePanelResize.ts` - Resize handling (204 lines)

### Step 2: Extract components

- `ChatPanel.tsx` - Container (152 lines)
- `ChatHeader.tsx` - Header bar (174 lines)
- `MessageList.tsx` - Messages (233 lines)
- `MessageBubble.tsx` - Individual messages (270 lines)
- `ChatInput.tsx` - Input area (341 lines)
- `CanvasContextPanel.tsx` - Context selector (319 lines)
- `ImageGallery.tsx` - Generated images (241 lines)

### Step 3: Clean up orchestrator

- `AIChatContainer.tsx` - Now 358 lines, only composes hooks/components

**Result:** 7 specialized components, 5 focused hooks, 1 clean orchestrator

---

## 🧾 Minimal Header Template (for files <50 lines)

```typescript
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🟡 utils.ts                    "The String Formatter"                       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  👤 I format text. Pure functions, no side effects.                          ║
 * ║  🎯 formatPhone(), slugify(), truncate()                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * @module utils
 */
```

**When to use minimal header:**

- Pure utility functions
- Simple constants files
- Type definitions only
- Files with single, obvious responsibility

---

## 📝 Summary

### Remember

1. **Personify everything** - Files are people with jobs
2. **Document relationships** - Show who talks to whom
3. **Stay small** - 300 lines is a soft limit, not a suggestion
4. **Isolate concerns** - UI renders, hooks manage, utilities calculate
5. **Update both sides** - When moving code, update source AND destination headers
6. **Test incrementally** - Build after every major change
7. **Be transparent** - If you make compromises, document them

**The goal:** Code that explains itself to Product Managers, not just developers.

---

## 🔗 Related Documents

- **Patterns & Anti-Patterns** → `@docs/patterns-and-anti-patterns.md` - Condensed learnings from refactoring sessions

---

*This system prompt ensures consistent, maintainable, and well-documented code architecture across all AI-assisted development sessions.*
