// Hand-transcribed from public/cold-call-tree/main-tree.webp (no source
// mermaid/doc exists — this was read directly off the flowchart image).
// Covers the "Collect & Lead Set" section: collecting an email, classifying
// the client, the insurance-policy favor ask, and the LEAD SET! outcome.

import { box, type TreeCard } from "./types";

export const collectCards: Record<string, TreeCard> = {
  "collect-good-email": {
    id: "collect-good-email",
    section: "collect",
    kind: "dialogue",
    eyebrow: "Collect",
    text: "What's a good email for you?",
    box: box(0.735, 0.4258, 0.06, 0.045),
    next: "collect-confirm-email",
    options: [{ label: '"My email is…"', target: "collect-confirm-email" }],
  },

  "collect-confirm-email": {
    id: "collect-confirm-email",
    section: "collect",
    kind: "dialogue",
    text: "*Read back their email and make sure you spelled it right.*",
    box: box(0.796, 0.4258, 0.055, 0.045),
    options: [
      { label: "Pro / warm client", target: "collect-who-insurance" },
      { label: "Normal / short cold client", target: "collect-send-email-goodbye" },
    ],
  },

  "collect-who-insurance": {
    id: "collect-who-insurance",
    section: "collect",
    kind: "dialogue",
    text: "Who do you go through for insurance?",
    box: box(0.8833, 0.4243, 0.05, 0.04),
    next: "collect-policy-favor",
    options: [{ label: "I use these guys", target: "collect-policy-favor" }],
  },

  "collect-policy-favor": {
    id: "collect-policy-favor",
    section: "collect",
    kind: "dialogue",
    text: "We do a lot of work with them — if you could do me a favor and send me over a copy of your policy, I'll be able to tell you if you're covered for the kind of damage we find.",
    box: box(0.9425, 0.4256, 0.06, 0.05),
    next: "collect-send-email-goodbye",
    options: [{ label: "Ok", target: "collect-send-email-goodbye" }],
  },

  "collect-send-email-goodbye": {
    id: "collect-send-email-goodbye",
    section: "collect",
    kind: "dialogue",
    text: "I'll send over that email shortly. It was great to meet you, have a great rest of your day.",
    box: box(0.945, 0.4675, 0.06, 0.045),
    next: "collect-lead-set",
    options: [{ label: "Continue", target: "collect-lead-set" }],
  },

  "collect-lead-set": {
    id: "collect-lead-set",
    section: "collect",
    kind: "dialogue",
    eyebrow: "Outcome",
    text: "**LEAD SET!**",
    box: box(0.976, 0.4649, 0.025, 0.055),
    options: [
      {
        label: "Send them the intro email with our insurance",
        target: "collect-note-send-insurance-email",
      },
      { label: "Upload to CRM", target: "collect-note-upload-crm" },
      { label: "Brag in chat that you set a lead", target: "collect-note-brag-chat" },
    ],
  },

  "collect-note-send-insurance-email": {
    id: "collect-note-send-insurance-email",
    section: "collect",
    kind: "dialogue",
    eyebrow: "Next step",
    text: "Send them the intro email with our insurance.",
    box: box(0.9975, 0.4155, 0.023, 0.032),
    options: [],
  },

  "collect-note-upload-crm": {
    id: "collect-note-upload-crm",
    section: "collect",
    kind: "dialogue",
    eyebrow: "Next step",
    text: "Upload to CRM.",
    box: box(0.9975, 0.4623, 0.023, 0.032),
    options: [],
  },

  "collect-note-brag-chat": {
    id: "collect-note-brag-chat",
    section: "collect",
    kind: "dialogue",
    eyebrow: "Next step",
    text: "Brag in chat that you set a lead.",
    box: box(0.9975, 0.5075, 0.023, 0.032),
    options: [],
  },
};
