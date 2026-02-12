# Aesthetic Overhaul Plan: Matching Default Excalidraw

## Current State Analysis

The application currently has a **"hand-drawn/sketch" aesthetic** with:

- **Fonts**: Virgil, Excalifont, Comic Shanns (handwritten/comic style)
- **Borders**: Thick 2px solid borders with dark colors
- **Shadows**: "Offset border" effect (`box-shadow: 4px 4px 0 var(--color-stroke)`)
- **Effects**: SVG sketch filters (`filter: url(#sketch-filter)`)
- **Colors**: Purple/indigo accents (#6366f1, #667eea)
- **Shapes**: Organic rounded corners with varied radius

## Target State: Default Excalidraw Aesthetic

The default Excalidraw has a **clean, minimal, professional aesthetic**:

- **Fonts**: System fonts (Inter, -apple-system, BlinkMacSystemFont, Segoe UI)
- **Borders**: Thin 1px or no visible borders, subtle separators
- **Shadows**: Subtle elevation shadows (0 1px 3px rgba(0,0,0,0.1))
- **Effects**: No sketch filters, clean flat design
- **Colors**: Neutral grays with subtle blue accents (#3b82f6, #2563eb)
- **Shapes**: Consistent, subtle rounded corners (4-8px)

---

## Implementation Plan

### Phase 1: CSS Foundation (Global Styles)

#### 1.1 Update `src/styles/sketch-theme.css`

**Changes:**

```css
/* BEFORE */
--font-hand: 'Excalifont', 'Virgil', cursive;
--font-mono: 'Cascadia Code', 'Comic Shanns', monospace;
--font-body: 'Comic Shanns', system-ui, sans-serif;

/* AFTER */
--font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-mono: 'SF Mono', Monaco, 'Cascadia Code', monospace;
--font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

**Color Palette Changes:**

```css
/* Light Theme - BEFORE */
--color-bg: #faf8f5;  /* warm paper */
--color-accent: #2563eb;
--color-stroke: #1a1a2e;

/* Light Theme - AFTER (Excalidraw-like) */
--color-bg: #ffffff;
--color-surface: #f8f9fa;
--color-accent: #3b82f6;  /* Excalidraw blue */
--color-border: #e5e5e5;  /* subtle gray borders */
--color-text: #1d1d1d;    /* near black */
--color-text-muted: #6b7280;
```

#### 1.2 Update `src/styles/global.css`

**Changes:**

- Remove `@font-face` declarations for Virgil, Excalifont, Comic Shanns
- Remove `.sketch-box`, `.sketch-badge`, `.sketch-btn` classes (or simplify)
- Remove sketch filter references
- Update heading styles to use system fonts

---

### Phase 2: Component-by-Component Updates

#### 2.1 Right-Side Controls (`CanvasControls.tsx`)

**Current Issues:**

- Thick 2px borders with offset shadows
- Hover effects that change border colors dramatically
- Comic font family

**Changes:**

```css
/* BEFORE */
.control-btn {
    border: 2px solid var(--color-stroke, #333);
    border-radius: 8px;
    font-family: var(--font-hand, sans-serif);
    box-shadow: 2px 2px 0 var(--color-stroke, #333);
}

/* AFTER */
.control-btn {
    border: 1px solid var(--color-border, #e5e5e5);
    border-radius: 6px;
    font-family: var(--font-ui);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    background: white;
}
.control-btn:hover {
    background: #f8f9fa;
    border-color: #d1d5db;
}
```

#### 2.2 AI Chat Panel (`AIChatContainer.tsx` + components)

**Current Issues:**

- "Hand-drawn" styling in panel
- Comic fonts throughout
- Thick borders

**Changes:**

- Replace all `font-family: var(--font-hand)` with `var(--font-ui)`
- Change panel border from `2px solid` to `1px solid #e5e5e5`
- Use subtle shadow: `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08)`
- Simplify header to clean minimal style
- Flat buttons with subtle hover states

#### 2.3 My Assets Panel (`MyAssetsPanel.tsx`)

**Current Issues:**

- Sketch-style borders
- Comic fonts
- Heavy shadow effects

**Changes:**

- Clean white background
- Thin 1px borders
- System fonts
- Subtle hover: background color change only
- Remove all `box-shadow: 2px 2px 0` patterns

#### 2.4 Share Modal (`ShareModal.tsx`)

**Current Issues:**

- Thick 3px border with offset shadow
- Comic font family
- "Sketch" styling

**Changes:**

- Modal: `border-radius: 8px`, `box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25)`
- Clean system fonts
- Primary button: Excalidraw blue (#3b82f6)
- Secondary button: White with gray border
- Remove offset shadow effects

#### 2.5 Image Generation Modal (`ImageGenerationModal.tsx`)

**Current Issues:**

- Comic styling
- Heavy borders

**Changes:**

- Clean minimal modal style
- Flat buttons
- System fonts
- Subtle input borders

#### 2.6 Menu/Dropdowns (in `CanvasControls.tsx`)

**Current Issues:**

- Menu has thick border and offset shadow
- Comic fonts

**Changes:**

- Clean dropdown: `border: 1px solid #e5e5e5`
- Subtle shadow: `0 10px 15px -3px rgba(0,0,0,0.1)`
- System fonts
- Hover: light gray background

---

### Phase 3: Toast & Notification Updates

#### 3.1 Toast Components (`CanvasApp.tsx`, `CanvasControls.tsx`)

**Changes:**

- Remove thick borders and offset shadows
- Use clean minimal toasts with subtle shadows
- System fonts
- Simplified animations

---

### Phase 4: Color System Overhaul

#### 4.1 Define New Color Palette

```css
/* Excalidraw-inspired palette */
:root {
  /* Backgrounds */
  --color-bg: #ffffff;
  --color-surface: #f8f9fa;
  --color-surface-hover: #f1f3f5;
  
  /* Text */
  --color-text: #1d1d1d;
  --color-text-secondary: #6b7280;
  --color-text-muted: #9ca3af;
  
  /* Borders */
  --color-border: #e5e5e5;
  --color-border-hover: #d1d5db;
  
  /* Accent (Excalidraw Blue) */
  --color-accent: #3b82f6;
  --color-accent-hover: #2563eb;
  --color-accent-light: #dbeafe;
  
  /* Status Colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}

/* Dark mode */
[data-theme="dark"] {
  --color-bg: #121212;
  --color-surface: #1e1e1e;
  --color-surface-hover: #2a2a2a;
  --color-text: #e5e5e5;
  --color-text-secondary: #a3a3a3;
  --color-border: #404040;
}
```

---

### Phase 5: Typography Updates

#### 5.1 Remove Custom Font Dependencies

- Remove `@font-face` declarations from `global.css`
- Delete or deprecate font files (Virgil.woff2, Excalifont-Regular.woff2, ComicShanns-Regular.woff2)

#### 5.2 Apply System Font Stack

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
               'Helvetica Neue', Arial, sans-serif;
}

code, pre {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
}
```

---

### Phase 6: Utility Classes Cleanup

#### 6.1 Update `src/styles/utilities.css`

- Remove `.text-hand` class
- Add `.text-ui` for consistent system font usage
- Update `.sketch-*` classes to use clean styling

---

### Phase 7: Testing & Polish

#### 7.1 Visual Regression Checklist

- [ ] Controls (right side) - clean, minimal
- [ ] AI Chat panel - professional, readable
- [ ] Assets panel - organized, clean
- [ ] Share modal - modern, minimal
- [ ] Image generation modal - clean
- [ ] Menu dropdowns - subtle, functional
- [ ] Toasts - minimal, non-intrusive
- [ ] Both light and dark themes

#### 7.2 Interaction Polish

- Ensure hover states are subtle (background color, not border changes)
- Ensure focus states are clear but not jarring
- Check all transitions are smooth and quick (150-200ms)

---

## File-by-File Checklist

### CSS Files

- [ ] `src/styles/sketch-theme.css` - Update CSS variables
- [ ] `src/styles/global.css` - Remove sketch styles, update fonts
- [ ] `src/styles/utilities.css` - Update utility classes

### React Components

- [ ] `src/components/islands/CanvasControls.tsx`
- [ ] `src/components/islands/CanvasApp.tsx` (toasts)
- [ ] `src/components/islands/ShareModal.tsx`
- [ ] `src/components/islands/MyAssetsPanel.tsx`
- [ ] `src/components/islands/SaveOptionsModal.tsx`
- [ ] `src/components/ai-chat/AIChatContainer.tsx`
- [ ] `src/components/ai-chat/components/ChatPanel.tsx`
- [ ] `src/components/ai-chat/components/ChatHeader.tsx`
- [ ] `src/components/ai-chat/components/MessageList.tsx`
- [ ] `src/components/ai-chat/components/ChatInput.tsx`
- [ ] `src/components/ai-chat/components/CanvasContextOverlay.tsx`
- [ ] `src/components/ai-chat/ImageGenerationModal.tsx`
- [ ] `src/components/ai-chat/TemplateModal.tsx`

### Astro Components (if styled)

- [ ] Check any `.astro` files with inline styles

---

## Migration Strategy

### Option A: Gradual Migration (Recommended)

1. Update CSS variables first (foundational)
2. Update components one by one, starting with most visible
3. Test each component after update
4. Keep both old and new utility classes during transition

### Option B: Big Bang

1. Update all CSS files
2. Update all components in one pass
3. Full regression test
4. Higher risk but faster

**Recommendation**: Option A - allows for incremental testing and feedback.

---

## Success Criteria

The aesthetic overhaul is successful when:

1. **No hand-drawn fonts remain** - All text uses system fonts
2. **No sketch filter effects** - Clean, flat design throughout
3. **Borders are subtle** - 1px or no borders, never 2px+ with offset shadows
4. **Colors are neutral** - No purple/indigo accents (except where intentional)
5. **Shadows are subtle** - Elevation shadows, not offset borders
6. **Feels like Excalidraw** - User should feel the cohesion with the canvas

---

## Notes

- The Excalidraw canvas itself already uses the clean aesthetic - we just need the UI chrome to match
- Keep the existing layout/structure - only change styling
- Maintain all existing functionality - pure visual changes
- Consider keeping the "warm paper" background as an option if users prefer it
