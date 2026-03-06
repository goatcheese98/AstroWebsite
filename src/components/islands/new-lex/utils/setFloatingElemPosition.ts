const VERTICAL_GAP = 10;
const HORIZONTAL_OFFSET = 5;

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

    let top = targetRect.top - floatingElemRect.height - verticalGap;
    let left = targetRect.left + horizontalOffset;

    if (top < editorScrollerRect.top) {
        top = targetRect.bottom + verticalGap;
    }

    const rightEdge = left + floatingElemRect.width;
    if (rightEdge > editorScrollerRect.right) {
        left = editorScrollerRect.right - floatingElemRect.width - horizontalOffset;
    }

    if (left < editorScrollerRect.left) {
        left = editorScrollerRect.left + horizontalOffset;
    }

    const relativeTop = top - anchorElementRect.top + scrollerElem.scrollTop;
    const relativeLeft = left - anchorElementRect.left;

    floatingElem.style.opacity = '1';
    floatingElem.style.transform = `translate(${relativeLeft}px, ${relativeTop}px)`;
}

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

    const verticalGap = 8;
    let top = targetRect.bottom + verticalGap;
    let left = targetRect.left - floatingElemRect.width / 2 + targetRect.width / 2;

    if (left + floatingElemRect.width > editorScrollerRect.right) {
        left = editorScrollerRect.right - floatingElemRect.width - 10;
    }
    if (left < editorScrollerRect.left) {
        left = editorScrollerRect.left + 10;
    }
    if (top + floatingElemRect.height > editorScrollerRect.bottom) {
        top = targetRect.top - floatingElemRect.height - verticalGap;
    }

    top -= anchorElementRect.top;
    left -= anchorElementRect.left;

    floatingElem.style.opacity = '1';
    floatingElem.style.transform = `translate(${left}px, ${top}px)`;
}
