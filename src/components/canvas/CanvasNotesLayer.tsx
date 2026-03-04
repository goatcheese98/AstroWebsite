/**
 * CanvasNotesLayer
 *
 * Renders custom overlay components on top of canvas.
 */

import {
  type ComponentType,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useCommandSubscriber, type ExcalidrawAPI, type ExcalidrawElement } from '@/stores';
import {
  OVERLAY_TYPES,
  applyOverlayUpdateByType,
  bumpElementVersion,
  collectOverlayElements,
  createEmptyOverlayElements,
  createOverlayRefMaps,
  getOverlayTypeFromElement,
  loadOverlayComponents,
  overlayRegistry,
  type OverlayAppState,
  type OverlayComponentsByType,
  type OverlayElementsByType,
  type OverlayRefsByType,
  type OverlayTransformRef,
  type OverlayType,
  type OverlayUpdatePayloadMap,
} from './overlay-registry';

type ElementPatch = Partial<ExcalidrawElement> & { id: string };

interface CanvasNotesLayerProps {
  api: ExcalidrawAPI | null;
}

const AUTO_FRONT_HOLD_MS = 3000;
const AUTO_FRONT_DRAG_THRESHOLD = 1;

interface ElementBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface AutoFrontState {
  selectedId: string | null;
  lastX: number;
  lastY: number;
  dragging: boolean;
  hoverTargetId: string | null;
  hoverSince: number;
  lastPromotedKey: string | null;
}

const createAutoFrontState = (): AutoFrontState => ({
  selectedId: null,
  lastX: 0,
  lastY: 0,
  dragging: false,
  hoverTargetId: null,
  hoverSince: 0,
  lastPromotedKey: null,
});

const rotatePoint = (
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  angle: number,
) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - centerX;
  const dy = y - centerY;
  return {
    x: centerX + dx * cos - dy * sin,
    y: centerY + dx * sin + dy * cos,
  };
};

const getElementBounds = (element: ExcalidrawElement): ElementBounds => {
  const x1 = element.x;
  const y1 = element.y;
  const x2 = element.x + element.width;
  const y2 = element.y + element.height;
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);
  const angle = element.angle || 0;

  if (!angle) {
    return { minX: left, minY: top, maxX: right, maxY: bottom };
  }

  const centerX = left + (right - left) / 2;
  const centerY = top + (bottom - top) / 2;
  const corners = [
    rotatePoint(left, top, centerX, centerY, angle),
    rotatePoint(right, top, centerX, centerY, angle),
    rotatePoint(right, bottom, centerX, centerY, angle),
    rotatePoint(left, bottom, centerX, centerY, angle),
  ];

  return {
    minX: Math.min(...corners.map((point) => point.x)),
    minY: Math.min(...corners.map((point) => point.y)),
    maxX: Math.max(...corners.map((point) => point.x)),
    maxY: Math.max(...corners.map((point) => point.y)),
  };
};

const boundsOverlap = (a: ElementBounds, b: ElementBounds) =>
  a.minX < b.maxX &&
  a.maxX > b.minX &&
  a.minY < b.maxY &&
  a.maxY > b.minY;

const bringElementToFront = (
  elements: ExcalidrawElement[],
  elementId: string,
): ExcalidrawElement[] | null => {
  const index = elements.findIndex((element) => element.id === elementId);
  if (index < 0 || index === elements.length - 1) return null;
  const reordered = elements.slice();
  const [selected] = reordered.splice(index, 1);
  reordered.push(selected);
  return reordered;
};

export default function CanvasNotesLayer({ api }: CanvasNotesLayerProps) {
  const [overlayComponents, setOverlayComponents] =
    useState<OverlayComponentsByType | null>(null);
  const [overlayElements, setOverlayElements] = useState<OverlayElementsByType>(
    () => createEmptyOverlayElements(),
  );

  // Refs for direct transform updates (bypass React for 60fps)
  const overlayRefs = useRef<OverlayRefsByType>(createOverlayRefMaps());
  const overlayStackIndexRef = useRef<Record<string, number>>({});
  const viewStateRef = useRef<OverlayAppState>({
    scrollX: 0,
    scrollY: 0,
    zoom: { value: 1 },
    selectedElementIds: {},
  });
  const pointerDownRef = useRef(false);
  const autoFrontRef = useRef<AutoFrontState>(createAutoFrontState());

  const resetAutoFrontState = useCallback(() => {
    autoFrontRef.current = createAutoFrontState();
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      pointerDownRef.current = true;
    };

    const handlePointerUp = () => {
      pointerDownRef.current = false;
      resetAutoFrontState();
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('pointerup', handlePointerUp, true);
    window.addEventListener('pointercancel', handlePointerUp, true);
    window.addEventListener('blur', handlePointerUp);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('pointerup', handlePointerUp, true);
      window.removeEventListener('pointercancel', handlePointerUp, true);
      window.removeEventListener('blur', handlePointerUp);
    };
  }, [resetAutoFrontState]);

  // Load overlay components on mount
  useEffect(() => {
    let mounted = true;
    loadOverlayComponents().then((components) => {
      if (mounted) {
        setOverlayComponents(components);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // RAF polling loop - unified clock for zero-lag overlay sync
  useEffect(() => {
    if (!api || !overlayComponents) return;

    let rafId: number;
    let lastUpdateTime = 0;
    const UPDATE_INTERVAL = 16; // React state updates at ~60fps

    const pollState = (timestamp: number) => {
      try {
        const elements = api.getSceneElements();
        const appState = api.getAppState();

        // Update view state ref
        viewStateRef.current = {
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
          zoom: appState.zoom,
          selectedElementIds:
            appState.selectedElementIds as Record<string, boolean> | undefined,
        };

        const groupedElements = collectOverlayElements(elements);
        const stackIndexById: Record<string, number> = {};
        elements.forEach((element, index) => {
          if (!getOverlayTypeFromElement(element)) return;
          stackIndexById[element.id] = index;
        });
        overlayStackIndexRef.current = stackIndexById;

        const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(
          (id) => appState.selectedElementIds?.[id],
        );
        const autoFront = autoFrontRef.current;
        if (!pointerDownRef.current || selectedIds.length !== 1) {
          if (
            autoFront.selectedId ||
            autoFront.dragging ||
            autoFront.hoverTargetId ||
            autoFront.hoverSince
          ) {
            resetAutoFrontState();
          }
        } else {
          const selectedId = selectedIds[0];
          const selectedElement = elements.find(
            (element) => element.id === selectedId && !element.isDeleted,
          );

          if (!selectedElement) {
            resetAutoFrontState();
          } else {
            if (autoFront.selectedId !== selectedId) {
              autoFront.selectedId = selectedId;
              autoFront.lastX = selectedElement.x;
              autoFront.lastY = selectedElement.y;
              autoFront.dragging = false;
              autoFront.hoverTargetId = null;
              autoFront.hoverSince = 0;
              autoFront.lastPromotedKey = null;
            } else {
              const movedX = Math.abs(selectedElement.x - autoFront.lastX);
              const movedY = Math.abs(selectedElement.y - autoFront.lastY);
              if (
                movedX > AUTO_FRONT_DRAG_THRESHOLD ||
                movedY > AUTO_FRONT_DRAG_THRESHOLD
              ) {
                autoFront.dragging = true;
                autoFront.lastX = selectedElement.x;
                autoFront.lastY = selectedElement.y;
              }
            }

            if (autoFront.dragging) {
              const selectedBounds = getElementBounds(selectedElement);
              let overlapTargetId: string | null = null;

              for (let i = elements.length - 1; i >= 0; i -= 1) {
                const candidate = elements[i];
                if (candidate.id === selectedId || candidate.isDeleted) continue;
                if (!boundsOverlap(selectedBounds, getElementBounds(candidate))) {
                  continue;
                }
                overlapTargetId = candidate.id;
                break;
              }

              if (overlapTargetId !== autoFront.hoverTargetId) {
                autoFront.hoverTargetId = overlapTargetId;
                autoFront.hoverSince = overlapTargetId ? timestamp : 0;
                autoFront.lastPromotedKey = null;
              }

              if (
                overlapTargetId &&
                autoFront.hoverSince &&
                timestamp - autoFront.hoverSince >= AUTO_FRONT_HOLD_MS
              ) {
                const promotionKey = `${selectedId}:${overlapTargetId}`;
                if (promotionKey !== autoFront.lastPromotedKey) {
                  const reordered = bringElementToFront(elements, selectedId);
                  if (reordered) {
                    api.updateScene({
                      elements: reordered,
                      appState: { selectedElementIds: { [selectedId]: true } },
                    });
                  }
                  autoFront.lastPromotedKey = promotionKey;
                  autoFront.hoverSince = timestamp;
                }
              }
            }
          }
        }

        // Unified clock: update transforms directly on refs (every frame, no React)
        for (const overlayType of OVERLAY_TYPES) {
          const refsForType = overlayRefs.current[overlayType];
          groupedElements[overlayType].forEach((element) => {
            const ref = refsForType.get(element.id);
            if (!ref?.updateTransform) return;

            ref.updateTransform(
              element.x,
              element.y,
              element.width,
              element.height,
              element.angle || 0,
              appState.zoom.value,
              appState.scrollX,
              appState.scrollY,
            );
          });
        }

        // React state updates only for mount/unmount
        if (timestamp - lastUpdateTime > UPDATE_INTERVAL) {
          setOverlayElements(groupedElements);
          lastUpdateTime = timestamp;
        }
      } catch (err) {
        console.error('[CanvasNotesLayer] Error polling:', err);
      }

      rafId = requestAnimationFrame(pollState);
    };

    rafId = requestAnimationFrame(pollState);
    return () => cancelAnimationFrame(rafId);
  }, [api, overlayComponents, resetAutoFrontState]);

  const handleOverlayUpdate = useCallback(
    (
      overlayType: OverlayType,
      elementId: string,
      payload: OverlayUpdatePayloadMap[OverlayType],
    ) => {
      if (!api) return;

      const sceneElements = api.getSceneElements();
      const updatedElements = sceneElements.map((element) => {
        if (element.id !== elementId) return element;
        return applyOverlayUpdateByType(overlayType, element, payload);
      });

      api.updateScene({ elements: updatedElements });
    },
    [api],
  );

  const handleDeselect = useCallback(() => {
    if (!api) return;
    api.updateScene({ appState: { selectedElementIds: {} } });
  }, [api]);

  // Handle commands from the store (CanvasUI handles onInsertImage and onDrawElements)
  useCommandSubscriber({
    onUpdateElements: async (payload) => {
      if (!api) return;

      const elementMap = new Map(
        (payload.elements as ElementPatch[]).map((element) => [
          element.id,
          element,
        ] as const),
      );

      const updatedElements = api.getSceneElements().map((element) => {
        const patch = elementMap.get(element.id);
        if (!patch) return element;

        const patchedElement = {
          ...element,
          ...patch,
        } as ExcalidrawElement;

        return bumpElementVersion(patchedElement);
      });

      api.updateScene({ elements: updatedElements });
    },
  });

  const registerOverlayRef = useCallback(
    (overlayType: OverlayType, id: string, ref: OverlayTransformRef | null) => {
      if (ref) {
        overlayRefs.current[overlayType].set(id, ref);
      } else {
        overlayRefs.current[overlayType].delete(id);
      }
    },
    [],
  );

  if (!overlayComponents) {
    return null;
  }

  const renderOverlayType = <K extends OverlayType>(overlayType: K) => {
    const Component = overlayComponents[overlayType] as ComponentType<any>;
    const descriptor = overlayRegistry[overlayType];
    const elementsForType = overlayElements[overlayType];

    return elementsForType.map((element) => {
      const props = descriptor.createProps({
        element: element as never,
        appState: viewStateRef.current,
        stackIndex: overlayStackIndexRef.current[element.id] ?? 0,
        onUpdate: (elementId: string, payload: OverlayUpdatePayloadMap[K]) =>
          handleOverlayUpdate(
            overlayType,
            elementId,
            payload as OverlayUpdatePayloadMap[OverlayType],
          ),
        onDeselect: handleDeselect,
      } as never);

      return (
        <Component
          key={element.id}
          {...props}
          ref={(ref: OverlayTransformRef | null) =>
            registerOverlayRef(
              overlayType,
              element.id,
              ref,
            )
          }
        />
      );
    });
  };

  return (
    <div
      className="canvas-notes-layer"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      {OVERLAY_TYPES.flatMap((overlayType) => renderOverlayType(overlayType))}
    </div>
  );
}
