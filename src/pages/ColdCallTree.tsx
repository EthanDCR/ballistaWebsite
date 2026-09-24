import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, animate, motion, useMotionValue } from "motion/react";
import { ArrowLeft, ArrowRight, PhoneCall, X } from "lucide-react";
import { TREE_IMAGE_HEIGHT, TREE_IMAGE_WIDTH, treeSections } from "../data/coldCallSections";
import { cardPixelBox, treeCards, type TreeCard } from "../data/coldCallTreeCards";
import "./ColdCallTree.css";

// Spots on the source image to paper over with a plain rectangle matching
// the image's own background — content that's now fully covered by an
// interactive card and no longer needs to show up baked into the artwork
// itself. Coordinates are fractional (0..1) of the full image.
const IMAGE_MASKS = [
  // The "Start Here" title + green legend box, top-left.
  { x: 0, y: 0.338, width: 0.059, height: 0.119 },
];

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

function renderCardText(text: string) {
  return text.split("\n\n").map((paragraph, pIndex) => (
    <p key={pIndex}>
      {paragraph.split("\n").map((line, lIndex, lines) => (
        <span key={lIndex}>
          {renderInline(line)}
          {lIndex < lines.length - 1 && <br />}
        </span>
      ))}
    </p>
  ));
}

function renderInline(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <span key={index}>{part}</span>;
  });
}

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
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const openCard = useMemo<TreeCard | null>(
    () => (openCardId ? (treeCards[openCardId] ?? null) : null),
    [openCardId],
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

  const openCardById = useCallback(
    (id: string) => {
      const card = treeCards[id];
      if (!card) return;
      setOpenCardId(id);
      setActiveId(card.section);
      goToBox(cardPixelBox(card), true);
    },
    [goToBox],
  );

  const goToSection = useCallback(
    (id: string | null, animated = true) => {
      setOpenCardId(null);
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
      setOpenCardId(null);
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
      setOpenCardId(null);
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
      setOpenCardId(null);
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
        setOpenCardId(null);
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
          setOpenCardId(null);
          zoomAt(e.clientX, e.clientY, 1.7);
        }}
      >
        <motion.div
          className="cct-canvas"
          style={{ x, y, scale, width: TREE_IMAGE_WIDTH, height: TREE_IMAGE_HEIGHT }}
        >
          <img
            className="cct-image"
            src="/cold-call-tree/main-tree.webp"
            alt="Cold call decision tree flowchart"
            draggable={false}
          />
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
          {treeSections.map((section) => (
            <div
              key={section.id}
              className={"cct-highlight" + (activeId === section.id ? " cct-highlight-active" : "")}
              style={{
                left: section.x * TREE_IMAGE_WIDTH,
                top: section.y * TREE_IMAGE_HEIGHT,
                width: section.width * TREE_IMAGE_WIDTH,
                height: section.height * TREE_IMAGE_HEIGHT,
              }}
            />
          ))}
          {Object.values(treeCards).map((card) => {
            const pixelBox = cardPixelBox(card);
            return (
              <button
                key={card.id}
                type="button"
                className={
                  "cct-node-hotspot" + (openCardId === card.id ? " cct-node-hotspot-active" : "")
                }
                style={{
                  left: pixelBox.left,
                  top: pixelBox.top,
                  width: pixelBox.width,
                  height: pixelBox.height,
                }}
                aria-label={`Open card: ${card.eyebrow ?? card.text.slice(0, 40)}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  openCardById(card.id);
                }}
              />
            );
          })}
        </motion.div>
      </div>

      <AnimatePresence>
        {openCard && (
          <TreeCardPanel
            card={openCard}
            hasNext={Boolean(openCard.next)}
            hasPrev={Boolean(findPrevCardId(openCard.id))}
            onNext={() => openCard.next && openCardById(openCard.next)}
            onPrev={() => {
              const prev = findPrevCardId(openCard.id);
              if (prev) openCardById(prev);
            }}
            onOption={(target) => openCardById(target)}
            onClose={() => setOpenCardId(null)}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="cct-brand"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : -12 }}
        transition={{ duration: 0.4 }}
      >
        <Link to="/" className="cct-brand-link">
          <span className="cct-brand-mark">
            <PhoneCall size={18} strokeWidth={2.6} />
          </span>
          <span>
            <strong>Ballista</strong>
            <small>Cold Call Decision Tree</small>
          </span>
        </Link>
      </motion.div>

      <motion.nav
        className="cct-nav"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 16 }}
        transition={{ duration: 0.4 }}
      >
        <div className="cct-nav-items">
          <button
            className={
              "cct-nav-item" + (activeId === null && !openCardId ? " cct-nav-item-active" : "")
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
                onClick={() => (entryCard ? openCardById(entryCard) : goToSection(section.id))}
              >
                {section.label}
              </button>
            );
          })}
        </div>

        <Link to="/cold-call-tree/script" className="cct-nav-link">
          The Basic Script →
        </Link>
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

function TreeCardPanel({
  card,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  onOption,
  onClose,
}: {
  card: TreeCard;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onOption: (target: string) => void;
  onClose: () => void;
}) {
  const sectionLabel = treeSections.find((s) => s.id === card.section)?.label;

  return (
    <motion.div
      className="cct-card-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
    >
      <motion.div
        key={card.id}
        className={`cct-card cct-card-${card.kind}`}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cct-card-top">
          <span className="cct-card-eyebrow">{card.eyebrow ?? sectionLabel}</span>
          <button className="cct-card-close" aria-label="Close card" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="cct-card-text">{renderCardText(card.text)}</div>

        {card.options.length > 0 && (
          <div className="cct-card-options">
            <span className="cct-card-options-label">Their response</span>
            {card.options.map((option, index) => (
              <button
                key={index}
                className={"cct-card-option" + (!option.target ? " cct-card-option-disabled" : "")}
                disabled={!option.target}
                onClick={() => option.target && onOption(option.target)}
              >
                {option.label}
                {!option.target && <small>Not mapped yet</small>}
              </button>
            ))}
          </div>
        )}

        <div className="cct-card-arrows">
          <button aria-label="Previous card" disabled={!hasPrev} onClick={onPrev}>
            <ArrowLeft size={18} />
          </button>
          <button aria-label="Next card" disabled={!hasNext} onClick={onNext}>
            <ArrowRight size={18} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
