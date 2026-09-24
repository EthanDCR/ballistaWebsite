import { TREE_IMAGE_HEIGHT, TREE_IMAGE_WIDTH } from "../coldCallSections";

export interface TreeCardOption {
  label: string;
  target?: string;
  // Fractional (0..1) position of this option's actual response label as it
  // appears on the connector line in the source image (e.g. "How much does
  // this cost?"). This is what should light up as clickable — the label is
  // what a rep reads to pick a branch, not the destination box. Falls back
  // to highlighting the target's own box when not yet measured.
  labelPos?: { x: number; y: number };
}

export interface TreeCardBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TreeCard {
  id: string;
  section: string;
  kind: "legend" | "dialogue";
  eyebrow?: string;
  text: string;
  box: TreeCardBox;
  next?: string;
  options: TreeCardOption[];
}

// cx/cy are the fractional (0..1) center of the node's box on
// main-tree.webp. Default size is tuned for a typical single dialogue box;
// pass w/h explicitly for bigger boxes.
export function box(cx: number, cy: number, w = 0.05, h = 0.036): TreeCardBox {
  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
}

export function cardPixelBox(card: TreeCard) {
  return {
    left: card.box.x * TREE_IMAGE_WIDTH,
    top: card.box.y * TREE_IMAGE_HEIGHT,
    width: card.box.width * TREE_IMAGE_WIDTH,
    height: card.box.height * TREE_IMAGE_HEIGHT,
  };
}
