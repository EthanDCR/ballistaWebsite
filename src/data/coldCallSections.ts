// Natural pixel size of /cold-call-tree/main-tree.webp
export const TREE_IMAGE_WIDTH = 6000;
export const TREE_IMAGE_HEIGHT = 3285;

export interface TreeSection {
  id: string;
  label: string;
  // fractional box within the image, 0..1
  x: number;
  y: number;
  width: number;
  height: number;
}

// Boxes were hand-mapped from the source flowchart PDF (excludes the
// "Basic Script" strip at the top, which lives on its own page).
export const treeSections: TreeSection[] = [
  {
    id: "start",
    label: "Start Here",
    x: 0,
    y: 0.3139,
    width: 0.0532,
    height: 0.1275,
  },
  {
    id: "first-ask",
    label: "First Ask",
    x: 0.1941,
    y: 0.3241,
    width: 0.1719,
    height: 0.1417,
  },
  {
    id: "qualify",
    label: "Qualify",
    x: 0.3328,
    y: 0.1721,
    width: 0.1885,
    height: 0.1823,
  },
  {
    id: "close",
    label: "Close & Schedule",
    x: 0.4603,
    y: 0.3443,
    width: 0.1719,
    height: 0.162,
  },
  {
    id: "objections",
    label: "Insurance Objections",
    x: 0,
    y: 0.486,
    width: 0.4103,
    height: 0.3747,
  },
  {
    id: "collect",
    label: "Collect & Lead Set",
    x: 0.6934,
    y: 0.3443,
    width: 0.3066,
    height: 0.1721,
  },
];
