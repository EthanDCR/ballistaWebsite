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
    box: box(0.3678, 0.3128, 0.0298, 0.0228),
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
    box: box(0.3528, 0.2619, 0.0292, 0.0277),
    next: "qualify-onsite",
    options: [{ label: "Continue", target: "qualify-onsite" }],
  },

  "qualify-earn-business": {
    id: "qualify-earn-business",
    section: "qualify",
    kind: "dialogue",
    text: "Perfect. Well, I'd love to earn your business and show you how we're different. If you still want to use your old guy after, no worries.",
    box: box(0.3868, 0.2619, 0.0290, 0.0283),
    next: "qualify-onsite",
    options: [{ label: "Continue", target: "qualify-onsite" }],
  },

  "qualify-onsite": {
    id: "qualify-onsite",
    section: "qualify",
    kind: "dialogue",
    eyebrow: "Qualify",
    text: "Do you work on-site at that building?",
    box: box(0.3678, 0.2172, 0.0278, 0.0320),
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
    box: box(0.4959, 0.2414, 0.0278, 0.0335),
    next: "close-gotcha",
    options: [{ label: "Continue", target: "close-gotcha" }],
  },

  "qualify-close-no": {
    id: "qualify-close-no",
    section: "qualify",
    kind: "dialogue",
    eyebrow: "Close",
    text: "Alright, well I'm gonna go ahead and send you an email with our company info, and I'm happy to stop by and take a look for you when we're near your building. We can catch up sometime next week and go over everything.",
    box: box(0.4959, 0.2834, 0.0318, 0.0396),
    next: "close-gotcha",
    options: [{ label: "Continue", target: "close-gotcha" }],
  },
};
