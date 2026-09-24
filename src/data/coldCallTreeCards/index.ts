import { firstAskCards } from "./firstAsk";
import { qualifyCards } from "./qualify";
import { closeCards } from "./close";
import { objectionsCards } from "./objections";
import { collectCards } from "./collect";

export type { TreeCard, TreeCardOption, TreeCardBox } from "./types";
export { cardPixelBox } from "./types";

export const treeCards = {
  ...firstAskCards,
  ...qualifyCards,
  ...closeCards,
  ...objectionsCards,
  ...collectCards,
};
