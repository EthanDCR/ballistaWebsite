// Hand-transcribed from public/cold-call-tree/main-tree.webp (no source
// mermaid/doc exists — this was read directly off the flowchart image).
// Covers the "Qualify" section: the roofer/maintenance-guy qualifying
// chain that First Ask's "I'll get someone else to look" branch leads
// into, plus the "Do you work on-site at that building?" checkpoint.

import { box, type TreeCard } from "./types";

export const qualifyCards: Record<string, TreeCard> = {
  "qualify-out-of-blue-or-roofer": {
    id: "qualify-out-of-blue-or-roofer",
    section: "qualify",
    kind: "dialogue",
    text: "Perfect, is this a guy that called you out of the blue, or someone you've done a lot of work with in the past?",
    box: box(0.365, 0.115, 0.065, 0.05),
    options: [
      { label: "Out of the blue", target: "qualify-throw-name" },
      { label: "Long time roofer", target: "qualify-earn-business" },
    ],
  },

  "qualify-throw-name": {
    id: "qualify-throw-name",
    section: "qualify",
    kind: "dialogue",
    text: "Gotcha — well, I'd love to throw my name in the ring and show you how we're different.",
    box: box(0.315, 0.236, 0.06, 0.05),
    next: "qualify-onsite",
    options: [{ label: "Continue", target: "qualify-onsite" }],
  },

  "qualify-earn-business": {
    id: "qualify-earn-business",
    section: "qualify",
    kind: "dialogue",
    text: "Perfect. Well, I'd love to earn your business and show you how we're different. If you still want to use your old guy after, no worries.",
    box: box(0.393, 0.236, 0.065, 0.06),
    next: "qualify-onsite",
    options: [{ label: "Continue", target: "qualify-onsite" }],
  },

  "qualify-onsite": {
    id: "qualify-onsite",
    section: "qualify",
    kind: "dialogue",
    eyebrow: "Qualify",
    text: "Do you work on-site at that building?",
    box: box(0.351, 0.281, 0.06, 0.05),
    options: [
      { label: "Yes", target: "qualify-close-yes" },
      { label: "No", target: "qualify-close-no" },
    ],
  },

  "qualify-close-yes": {
    id: "qualify-close-yes",
    section: "qualify",
    kind: "dialogue",
    eyebrow: "Close",
    text: "I'm gonna go ahead and send you an email, and I'd love to stop by, shake your hand, and show you what we can do to help ya, later this week or next week.",
    box: box(0.465, 0.259, 0.065, 0.06),
    next: "close-gotcha",
    options: [{ label: "Continue", target: "close-gotcha" }],
  },

  "qualify-close-no": {
    id: "qualify-close-no",
    section: "qualify",
    kind: "dialogue",
    eyebrow: "Close",
    text: "Alright, well I'm gonna go ahead and send you an email with our company info, and I'm happy to stop by and take a look for you when we're near your building. We can catch up sometime next week and go over everything.",
    box: box(0.469, 0.31, 0.07, 0.065),
    next: "close-gotcha",
    options: [{ label: "Continue", target: "close-gotcha" }],
  },
};
