/**
 * Shared z-index logic for canvas overlay elements (MarkdownNote, LexicalNote, WebEmbed, KanbanBoard).
 *
 * Levels:
 *   1 – default (element not selected, sits flush with canvas)
 *   2 – selected (above sibling overlays, still below Excalidraw UI panels)
 *   5 – actively editing (above panels so toolbars/dropdowns don't clip content)
 */
export function getOverlayZIndex(isSelected: boolean, isEditing = false): number {
  if (isEditing) return 5;
  if (isSelected) return 2;
  return 1;
}
