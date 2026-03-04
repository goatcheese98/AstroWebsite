/**
 * Shared z-index logic for canvas overlay elements (MarkdownNote, LexicalNote, WebEmbed, KanbanBoard).
 *
 * Levels:
 *   - Base stack follows scene order (`stackIndex`)
 *   - Selected overlays are promoted within the same stack band
 *   - Editing overlays are promoted within the same stack band
 */
export function getOverlayZIndex(
  isSelected: boolean,
  isEditing = false,
  stackIndex = 0,
): number {
  const clampedStack = Math.max(0, Math.min(Math.floor(stackIndex), 9999));
  const base = clampedStack * 10;
  if (isEditing) return base + 3;
  if (isSelected) return base + 2;
  return base + 1;
}
