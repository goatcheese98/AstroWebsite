/**
 * Utility to position a floating element relative to a target rect
 * Used by floating toolbar plugins
 */

const VERTICAL_GAP = 10;
const HORIZONTAL_OFFSET = 5;

/**
 * Position a floating element relative to a target rect.
 * Positions above the selection by default, falls back to below if not enough space.
 */
export function setFloatingElemPosition(
    targetRect: DOMRect | null,
    floatingElem: HTMLElement,
    anchorElem: HTMLElement,
    verticalGap: number = VERTICAL_GAP,
    horizontalOffset: number = HORIZONTAL_OFFSET,
): void {
    const scrollerElem = anchorElem.parentElement;

    if (targetRect === null || !scrollerElem) {
        floatingElem.style.opacity = '0';
        floatingElem.style.transform = 'translate(-10000px, -10000px)';
        return;
    }

    const floatingElemRect = floatingElem.getBoundingClientRect();
    const anchorElementRect = anchorElem.getBoundingClientRect();
    const editorScrollerRect = scrollerElem.getBoundingClientRect();

    // Position above the selection by default
    let top = targetRect.top - floatingElemRect.height - verticalGap;
    let left = targetRect.left + horizontalOffset;

    // If there's not enough space above, position below
    if (top < editorScrollerRect.top) {
        top = targetRect.bottom + verticalGap;
    }

    // Ensure the toolbar doesn't go outside the editor horizontally
    const rightEdge = left + floatingElemRect.width;
    if (rightEdge > editorScrollerRect.right) {
        left = editorScrollerRect.right - floatingElemRect.width - horizontalOffset;
    }

    // Ensure the toolbar doesn't go outside the left edge
    if (left < editorScrollerRect.left) {
        left = editorScrollerRect.left + horizontalOffset;
    }

    // Calculate position relative to the anchor element
    const relativeTop = top - anchorElementRect.top + scrollerElem.scrollTop;
    const relativeLeft = left - anchorElementRect.left;

    floatingElem.style.opacity = '1';
    floatingElem.style.transform = `translate(${relativeLeft}px, ${relativeTop}px)`;
}

/**
 * Position a floating element centered above the selection range.
 * This is the preferred positioning for the text format toolbar.
 */
export function setFloatingElemPositionForRange(
    targetRect: DOMRect | null,
    floatingElem: HTMLElement,
    anchorElem: HTMLElement,
    verticalGap: number = VERTICAL_GAP,
): void {
    const scrollerElem = anchorElem.parentElement;

    if (targetRect === null || !scrollerElem) {
        floatingElem.style.opacity = '0';
        floatingElem.style.transform = 'translate(-10000px, -10000px)';
        return;
    }

    const floatingElemRect = floatingElem.getBoundingClientRect();
    const anchorElementRect = anchorElem.getBoundingClientRect();
    const editorScrollerRect = scrollerElem.getBoundingClientRect();

    // Center horizontally above the selection
    let top = targetRect.top - floatingElemRect.height - verticalGap;
    let left = targetRect.left + (targetRect.width / 2) - (floatingElemRect.width / 2);

    // Position above the selection by default
    // If there's not enough space above, position below
    if (top < editorScrollerRect.top) {
        top = targetRect.bottom + verticalGap;
    }

    // Ensure the toolbar doesn't go outside the editor horizontally
    if (left < editorScrollerRect.left) {
        left = editorScrollerRect.left + 5;
    } else if (left + floatingElemRect.width > editorScrollerRect.right) {
        left = editorScrollerRect.right - floatingElemRect.width - 5;
    }

    // Calculate position relative to the anchor element
    const relativeTop = top - anchorElementRect.top + scrollerElem.scrollTop;
    const relativeLeft = left - anchorElementRect.left;

    floatingElem.style.opacity = '1';
    floatingElem.style.transform = `translate(${relativeLeft}px, ${relativeTop}px)`;
}

/**
 * Position specifically for the link editor (appears below the link)
 */
export function setFloatingElemPositionForLinkEditor(
    targetRect: DOMRect | null,
    floatingElem: HTMLElement,
    anchorElem: HTMLElement,
): void {
    const scrollerElem = anchorElem.parentElement;

    if (targetRect === null || !scrollerElem) {
        floatingElem.style.opacity = '0';
        floatingElem.style.transform = 'translate(-10000px, -10000px)';
        return;
    }

    const floatingElemRect = floatingElem.getBoundingClientRect();
    const anchorElementRect = anchorElem.getBoundingClientRect();
    const editorScrollerRect = scrollerElem.getBoundingClientRect();

    // Position below the link with a small gap
    const verticalGap = 8;
    let top = targetRect.bottom + verticalGap;
    let left = targetRect.left;

    // Center the floating element relative to the target
    left = left - floatingElemRect.width / 2 + targetRect.width / 2;

    // Check if floating element would overflow right edge of editor
    if (left + floatingElemRect.width > editorScrollerRect.right) {
        left = editorScrollerRect.right - floatingElemRect.width - 10;
    }

    // Check if floating element would overflow left edge of editor
    if (left < editorScrollerRect.left) {
        left = editorScrollerRect.left + 10;
    }

    // Check if floating element would overflow bottom of editor
    // If so, position it above the link instead
    if (top + floatingElemRect.height > editorScrollerRect.bottom) {
        top = targetRect.top - floatingElemRect.height - verticalGap;
    }

    // Position relative to the anchor element
    top -= anchorElementRect.top;
    left -= anchorElementRect.left;

    floatingElem.style.opacity = '1';
    floatingElem.style.transform = `translate(${left}px, ${top}px)`;
}
