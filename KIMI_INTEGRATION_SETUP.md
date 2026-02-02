# Kimi K2.5 Integration - Setup Guide

## Status: ✅ ACTIVE (Claude Disabled for Testing)

Kimi K2.5 is now the **primary AI** for the canvas chat. Claude is configured as backup but currently disabled for testing.

---

## Environment Setup

Add your Kimi API key to `.dev.vars`:

```bash
# .dev.vars
MOONSHOT_API_KEY=sk-ZUCIlEk239TLGC4zsxXq16HRpvS3TzHcajKM7n925cTsN09Z

# Keep Claude for backup (when re-enabled)
ANTHROPIC_API_KEY=sk-ant-...
```

**⚠️ IMPORTANT:** Never commit API keys to git!

---

## Architecture

```
User Request
    ↓
AIChatContainer.tsx
    ↓
/api/chat-kimi (PRIMARY - Active)
    ↓
Kimi K2.5 API (Moonshot)

Fallback (currently disabled):
/api/chat (BACKUP - Disabled)
    ↓
Claude API
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/api/chat-kimi.ts` | NEW - Kimi API endpoint |
| `src/components/ai-chat/AIChatContainer.tsx` | Now calls `/api/chat-kimi` |
| `src/env.d.ts` | Added `MOONSHOT_API_KEY` type |
| `.dev.vars` | Add your key here (not in repo) |

---

## Testing Checklist

- [ ] Add `MOONSHOT_API_KEY` to `.dev.vars`
- [ ] Restart dev server
- [ ] Open AI chat panel
- [ ] Verify "Kimi K2.5" badge shows in header
- [ ] Send a message
- [ ] Verify "Kimi is thinking..." appears
- [ ] Check response quality for diagram generation
- [ ] Verify JSON parsing works for Excalidraw elements

---

## Switching Back to Claude

To re-enable Claude as backup, edit `AIChatContainer.tsx`:

```typescript
// In the catch block of handleSend, uncomment:
} catch (err) {
    console.error('❌ Kimi error:', err);
    setError(err instanceof Error ? err.message : "Something went wrong");
    
    // BACKUP: Claude (uncomment to enable)
    console.log('🔄 Falling back to Claude...');
    try {
        const response = await fetch("/api/chat", { ... });
        // ... handle response
    } catch (claudeErr) {
        setError("Both Kimi and Claude failed.");
    }
}
```

To make Claude primary again, swap the fetch calls.

---

## Model Comparison

| Feature | Claude Sonnet | Kimi K2.5 |
|---------|---------------|-----------|
| **Speed** | Fast | Very Fast |
| **Diagram Quality** | Excellent | Testing... |
| **JSON Reliability** | Excellent | Testing... |
| **Price** | Higher | Lower |
| **Context Window** | 200K | 256K |

---

## API Differences

Kimi uses OpenAI-compatible format:

```typescript
// Kimi (OpenAI-compatible)
fetch('https://api.moonshot.cn/v1/chat/completions', {
  model: 'kimi-k2-5',
  messages: [{ role: 'system', content: prompt }, ...],
  temperature: 0.7,
  max_tokens: 4096,
})

// Claude (Anthropic SDK)
client.messages.create({
  model: 'claude-sonnet-4-20250514',
  system: prompt,
  messages: [...],
  max_tokens: 4096,
})
```

---

## Troubleshooting

### "API key not configured"
- Check `.dev.vars` has `MOONSHOT_API_KEY`
- Restart dev server after adding key

### "Failed to get AI response"
- Check browser console for error details
- Verify API key is valid at platform.moonshot.cn
- Check network tab for 401/403 errors

### JSON parsing fails
- Kimi might format JSON differently than Claude
- Check console for raw response
- Adjust regex patterns if needed

---

## Reverting Changes

To go back to Claude-only:

1. In `AIChatContainer.tsx`, change:
   ```typescript
   const response = await fetch("/api/chat-kimi", ...)
   // back to:
   const response = await fetch("/api/chat", ...)
   ```

2. Remove the "Kimi K2.5" badge from header

3. Change "Kimi is thinking..." back to "AI is thinking..."

---

*Integration Date: 2026-02-01*
*Status: Testing Phase*
