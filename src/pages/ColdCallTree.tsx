import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from "react";
import { AnimatePresence, animate, motion, useMotionValue } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Home, X } from "lucide-react";
import { TREE_IMAGE_HEIGHT, TREE_IMAGE_WIDTH, treeSections } from "../data/coldCallSections";
import { cardPixelBox, treeCards, type TreeCard } from "../data/coldCallTreeCards";
import "./ColdCallTree.css";

// Spots on the source image to paper over with a plain rectangle matching
// the image's own background — content that's now fully covered by an
// interactive card and no longer needs to show up baked into the artwork
// itself. Coordinates are fractional (0..1) of the full image.
//
// Currently empty: the one entry here covered the "Start Here" legend block,
// which only exists in the older .webp export. main-tree.svg leaves that
// corner blank and marks the opener with a "CALL STARTS HERE" sticky instead.
const IMAGE_MASKS: { x: number; y: number; width: number; height: number }[] = [];

// Sections that have been transcribed into interactive cards so far, mapped
// to the card that opens when you jump into that section.
const SECTION_ENTRY_CARD: Record<string, string> = {
  start: "start",
  "first-ask": "opener",
  qualify: "qualify-onsite",
  close: "close-gotcha",
  objections: "obj-aw-man-why",
  collect: "collect-good-email",
};

function findPrevCardId(id: string): string | undefined {
  return Object.values(treeCards).find((card) => card.next === id)?.id;
}

interface OptionMarker {
  target: string;
  label: string;
  isLabelBased: boolean;
  box: Box;
}

// What actually lights up as clickable: the response label as it appears on
// the connector line in the source image (e.g. "How much does this cost?")
// — that's what a rep reads to pick a branch, not the destination box. Only
// falls back to outlining the whole target box when we haven't measured
// that label's position yet.
function optionMarkers(card: TreeCard): OptionMarker[] {
  const markers: OptionMarker[] = [];
  for (const option of card.options) {
    if (!option.target) continue;
    if (option.labelPos) {
      // Calibrated against measured label text in the source image: the
      // connector labels run ~3.9px/char wide and ~16px tall at full
      // resolution, so keep the marker close to that plus a little padding.
      const width = Math.max(option.label.length * 4.2 + 26, 70);
      const height = 34;
      markers.push({
        target: option.target,
        label: option.label,
        isLabelBased: true,
        box: {
          left: option.labelPos.x * TREE_IMAGE_WIDTH - width / 2,
          top: option.labelPos.y * TREE_IMAGE_HEIGHT - height / 2,
          width,
          height,
        },
      });
      continue;
    }
    const targetCard = treeCards[option.target];
    if (!targetCard) continue;
    markers.push({
      target: option.target,
      label: option.label,
      isLabelBased: false,
      box: cardPixelBox(targetCard),
    });
  }
  return markers;
}

function unionBox(boxes: Box[]): Box {
  const left = Math.min(...boxes.map((b) => b.left));
  const top = Math.min(...boxes.map((b) => b.top));
  const right = Math.max(...boxes.map((b) => b.left + b.width));
  const bottom = Math.max(...boxes.map((b) => b.top + b.height));
  const pad = Math.max(right - left, bottom - top) * 0.2;
  return {
    left: left - pad,
    top: top - pad,
    width: right - left + pad * 2,
    height: bottom - top + pad * 2,
  };
}

// How long the view must hold still before the crisp vector copy is mounted.
const SHARP_DELAY_MS = 180;

const MIN_SCALE = 0.08;
const MAX_SCALE = 6;
const FIT_PADDING = 0.9;
const SPRING = { type: "spring", stiffness: 140, damping: 24, mass: 0.6 } as const;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const ALL_BOX: Box = {
  left: 0,
  top: 0,
  width: TREE_IMAGE_WIDTH,
  height: TREE_IMAGE_HEIGHT,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fitTransform(box: Box, viewportWidth: number, viewportHeight: number) {
  const scaleX = (viewportWidth * FIT_PADDING) / box.width;
  const scaleY = (viewportHeight * FIT_PADDING) / box.height;
  const scale = clamp(Math.min(scaleX, scaleY), MIN_SCALE, MAX_SCALE);
  const x = viewportWidth / 2 - (box.left + box.width / 2) * scale;
  const y = viewportHeight / 2 - (box.top + box.height / 2) * scale;
  return { x, y, scale };
}

export default function ColdCallTree() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pinchState = useRef<{
    distance: number;
    midX: number;
    midY: number;
  } | null>(null);
  const panState = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  // The artwork is swapped for a crisp vector copy once the view stops
  // moving — see SHARP_DELAY_MS below.
  const [sharp, setSharp] = useState(true);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Vector artwork is far too expensive to re-rasterise on every frame of a
  // pan or pinch — the browser redraws ~10k glyph/path nodes each time the
  // scale changes, which drops frames badly. So we ride on a flat raster
  // while the view is moving and only mount the SVG once it settles, where
  // a single rasterisation buys full sharpness at any zoom.
  const sharpRef = useRef(true);
  useEffect(() => {
    let timer: number | undefined;
    const bump = () => {
      if (sharpRef.current) {
        sharpRef.current = false;
        setSharp(false);
      }
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        sharpRef.current = true;
        setSharp(true);
      }, SHARP_DELAY_MS);
    };
    const stop = [x.on("change", bump), y.on("change", bump), scale.on("change", bump)];
    return () => {
      stop.forEach((off) => off());
      if (timer) window.clearTimeout(timer);
    };
  }, [x, y, scale]);
  const activeCard = useMemo<TreeCard | null>(
    () => (activeCardId ? (treeCards[activeCardId] ?? null) : null),
    [activeCardId],
  );
  const activeOptionMarkers = useMemo<OptionMarker[]>(
    () => (activeCard ? optionMarkers(activeCard) : []),
    [activeCard],
  );

  const goToBox = useCallback(
    (box: Box, animated: boolean) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const target = fitTransform(box, rect.width, rect.height);
      if (animated) {
        animate(x, target.x, SPRING);
        animate(y, target.y, SPRING);
        animate(scale, target.scale, SPRING);
      } else {
        x.set(target.x);
        y.set(target.y);
        scale.set(target.scale);
      }
    },
    [x, y, scale],
  );

  const focusNode = useCallback(
    (id: string) => {
      const card = treeCards[id];
      if (!card) return;
      setActiveCardId(id);
      setActiveId(card.section);
      // Frame the current box plus its clickable response labels. Labels are
      // small and sit right on the connector lines, so this stays tight —
      // framing whole destination boxes zoomed way out.
      const boxes = [cardPixelBox(card), ...optionMarkers(card).map((m) => m.box)];
      goToBox(unionBox(boxes), true);
    },
    [goToBox],
  );

  const goToSection = useCallback(
    (id: string | null, animated = true) => {
      setActiveCardId(null);
      setActiveId(id);
      const box =
        id === null
          ? ALL_BOX
          : (() => {
              const section = treeSections.find((s) => s.id === id);
              if (!section) return ALL_BOX;
              return {
                left: section.x * TREE_IMAGE_WIDTH,
                top: section.y * TREE_IMAGE_HEIGHT,
                width: section.width * TREE_IMAGE_WIDTH,
                height: section.height * TREE_IMAGE_HEIGHT,
              };
            })();
      goToBox(box, animated);
    },
    [goToBox],
  );

  useEffect(() => {
    goToSection(null, false);
    setReady(true);
    const handleResize = () => goToSection(activeId, false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = clientX - rect.left;
      const cy = clientY - rect.top;
      const currentScale = scale.get();
      const newScale = clamp(currentScale * factor, MIN_SCALE, MAX_SCALE);
      const ix = (cx - x.get()) / currentScale;
      const iy = (cy - y.get()) / currentScale;
      x.set(cx - ix * newScale);
      y.set(cy - iy * newScale);
      scale.set(newScale);
    },
    [x, y, scale],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const pan = panState.current;
      if (!pan || pan.pointerId !== e.pointerId) return;
      x.set(pan.originX + (e.clientX - pan.startClientX));
      y.set(pan.originY + (e.clientY - pan.startClientY));
    },
    [x, y],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (panState.current?.pointerId !== e.pointerId) return;
      panState.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    },
    [handlePointerMove],
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (!e.isPrimary) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;
      setActiveId(null);
      setActiveCardId(null);
      panState.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        originX: x.get(),
        originY: y.get(),
      };
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [x, y, handlePointerMove, handlePointerUp],
  );

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      setActiveId(null);
      setActiveCardId(null);
      const factor = Math.exp(-e.deltaY * 0.0012);
      zoomAt(e.clientX, e.clientY, factor);
    },
    [zoomAt],
  );

  const zoomButton = useCallback(
    (factor: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setActiveId(null);
      setActiveCardId(null);
      const currentScale = scale.get();
      const newScale = clamp(currentScale * factor, MIN_SCALE, MAX_SCALE);
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const ix = (cx - x.get()) / currentScale;
      const iy = (cy - y.get()) / currentScale;
      animate(x, cx - ix * newScale, SPRING);
      animate(y, cy - iy * newScale, SPRING);
      animate(scale, newScale, SPRING);
    },
    [x, y, scale],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const touchDistance = (touches: TouchList) => {
      const [a, b] = [touches[0], touches[1]];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };
    const touchMid = (touches: TouchList) => {
      const [a, b] = [touches[0], touches[1]];
      return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        setActiveId(null);
        setActiveCardId(null);
        panState.current = null;
        const mid = touchMid(e.touches);
        pinchState.current = {
          distance: touchDistance(e.touches),
          midX: mid.x,
          midY: mid.y,
        };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchState.current) {
        e.preventDefault();
        const distance = touchDistance(e.touches);
        const mid = touchMid(e.touches);
        const factor = distance / pinchState.current.distance;
        zoomAt(mid.x, mid.y, factor);
        pinchState.current = { distance, midX: mid.x, midY: mid.y };
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchState.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [zoomAt]);

  return (
    <div className="cct-page">
      <div
        className="cct-viewport"
        ref={viewportRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onDoubleClick={(e) => {
          setActiveId(null);
          setActiveCardId(null);
          zoomAt(e.clientX, e.clientY, 1.7);
        }}
      >
        <motion.div
          className="cct-canvas"
          style={{ x, y, scale, width: TREE_IMAGE_WIDTH, height: TREE_IMAGE_HEIGHT }}
        >
          <img
            className="cct-image"
            src="/cold-call-tree/main-tree-base.webp"
            alt="Cold call decision tree flowchart"
            draggable={false}
          />
          {sharp && (
            <img
              className="cct-image cct-image-sharp"
              src="/cold-call-tree/main-tree.svg"
              alt=""
              aria-hidden
              draggable={false}
            />
          )}
          {IMAGE_MASKS.map((mask, index) => (
            <div
              key={index}
              className="cct-image-mask"
              style={{
                left: mask.x * TREE_IMAGE_WIDTH,
                top: mask.y * TREE_IMAGE_HEIGHT,
                width: mask.width * TREE_IMAGE_WIDTH,
                height: mask.height * TREE_IMAGE_HEIGHT,
              }}
            />
          ))}
          {activeCard && (
            <div
              className="cct-spotlight"
              style={(() => {
                const boxes = [
                  cardPixelBox(activeCard),
                  ...activeOptionMarkers.map((marker) => marker.box),
                ];
                const spot = unionBox(boxes);
                return {
                  left: spot.left,
                  top: spot.top,
                  width: spot.width,
                  height: spot.height,
                };
              })()}
            />
          )}
          {Object.values(treeCards).map((card) => {
            const pixelBox = cardPixelBox(card);
            const isCurrent = activeCardId === card.id;
            return (
              <button
                key={card.id}
                type="button"
                className={"cct-node-hotspot" + (isCurrent ? " cct-node-hotspot-current" : "")}
                style={{
                  left: pixelBox.left,
                  top: pixelBox.top,
                  width: pixelBox.width,
                  height: pixelBox.height,
                }}
                aria-label={`Focus card: ${card.eyebrow ?? card.text.slice(0, 40)}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  focusNode(card.id);
                }}
              />
            );
          })}
          {activeOptionMarkers.map((marker) => (
            <button
              key={marker.target}
              type="button"
              className={
                "cct-option-marker" + (marker.isLabelBased ? " cct-option-marker-label" : "")
              }
              style={{
                left: marker.box.left,
                top: marker.box.top,
                width: marker.box.width,
                height: marker.box.height,
              }}
              aria-label={`Choose: ${marker.label}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                focusNode(marker.target);
              }}
            />
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        {activeCard?.kind === "legend" && (
          <motion.div
            className="cct-legend-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => {
              setActiveCardId(null);
              setActiveId(null);
            }}
          >
            <motion.div
              className="cct-legend-card"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cct-legend-top">
                <span className="cct-legend-eyebrow">{activeCard.eyebrow}</span>
                <button
                  className="cct-legend-close"
                  aria-label="Close"
                  onClick={() => {
                    setActiveCardId(null);
                    setActiveId(null);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="cct-legend-text">
                {activeCard.text.split("\n\n").map((para, i) => (
                  <p key={i}>
                    {para.split("\n").map((line, j, lines) => (
                      <span key={j}>
                        {line
                          .split(/(\*\*[^*]+\*\*)/g)
                          .filter(Boolean)
                          .map((part, k) =>
                            part.startsWith("**") && part.endsWith("**") ? (
                              <strong key={k}>{part.slice(2, -2)}</strong>
                            ) : (
                              <span key={k}>{part}</span>
                            ),
                          )}
                        {j < lines.length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                ))}
              </div>
              {activeCard.next && (
                <button
                  className="cct-legend-next"
                  onClick={() => activeCard.next && focusNode(activeCard.next)}
                >
                  Start the call <ArrowRight size={14} />
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCard && activeCard.kind !== "legend" && (
          <motion.div
            className="cct-focus-bar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <button
              aria-label="Previous card"
              disabled={!findPrevCardId(activeCard.id)}
              onClick={() => {
                const prev = findPrevCardId(activeCard.id);
                if (prev) focusNode(prev);
              }}
            >
              <ArrowLeft size={14} />
            </button>
            <span className="cct-focus-bar-label">
              {activeCard.eyebrow ?? treeSections.find((s) => s.id === activeCard.section)?.label}
            </span>
            <button
              aria-label="Next card"
              disabled={!activeCard.next}
              onClick={() => activeCard.next && focusNode(activeCard.next)}
            >
              <ArrowRight size={14} />
            </button>
            <button
              className="cct-focus-bar-close"
              aria-label="Exit focus"
              onClick={() => {
                setActiveCardId(null);
                setActiveId(null);
              }}
            >
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav
        className="cct-nav"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 16 }}
        transition={{ duration: 0.4 }}
      >
        <Link to="/" className="cct-nav-home" aria-label="Back to training portal" title="Home">
          <Home size={15} />
        </Link>

        <div className="cct-nav-items">
          <button
            className={
              "cct-nav-item" + (activeId === null && !activeCardId ? " cct-nav-item-active" : "")
            }
            onClick={() => goToSection(null)}
          >
            Full Tree
          </button>
          {treeSections.map((section) => {
            const entryCard = SECTION_ENTRY_CARD[section.id];
            return (
              <button
                key={section.id}
                className={"cct-nav-item" + (activeId === section.id ? " cct-nav-item-active" : "")}
                onClick={() => (entryCard ? focusNode(entryCard) : goToSection(section.id))}
              >
                {section.label}
              </button>
            );
          })}
        </div>
      </motion.nav>

      <div className="cct-zoom-controls">
        <button aria-label="Zoom out" onClick={() => zoomButton(1 / 1.4)}>
          −
        </button>
        <button aria-label="Zoom in" onClick={() => zoomButton(1.4)}>
          +
        </button>
      </div>
    </div>
  );
}
