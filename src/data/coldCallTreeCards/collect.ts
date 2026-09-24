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
    box: box(0.6976, 0.4219, 0.0292, 0.0177),
    next: "collect-confirm-email",
    options: [
      {
        label: '"My email is…"',
        target: "collect-confirm-email",
        labelPos: { x: 0.72, y: 0.4217 },
      },
    ],
  },

  "collect-confirm-email": {
    id: "collect-confirm-email",
    section: "collect",
    kind: "dialogue",
    text: "*Read back their email and make sure you spelled it right.*",
    box: box(0.7489, 0.4225, 0.0312, 0.0177),
    options: [
      {
        label: "Pro / warm client",
        target: "collect-who-insurance",
        labelPos: { x: 0.7853, y: 0.4171 },
      },
      {
        label: "Normal / short cold client",
        target: "collect-send-email-goodbye",
        labelPos: { x: 0.7858, y: 0.436 },
      },
    ],
  },

  "collect-who-insurance": {
    id: "collect-who-insurance",
    section: "collect",
    kind: "dialogue",
    text: "Who do you go through for insurance?",
    box: box(0.8125, 0.4070, 0.0310, 0.0177),
    next: "collect-policy-favor",
    options: [
      {
        label: "I use these guys",
        target: "collect-policy-favor",
        labelPos: { x: 0.8345, y: 0.4079 },
      },
    ],
  },

  "collect-policy-favor": {
    id: "collect-policy-favor",
    section: "collect",
    kind: "dialogue",
    text: "We do a lot of work with them — if you could do me a favor and send me over a copy of your policy, I'll be able to tell you if you're covered for the kind of damage we find.",
    box: box(0.8593, 0.4070, 0.0310, 0.0244),
    next: "collect-send-email-goodbye",
    options: [
      { label: "Ok", target: "collect-send-email-goodbye", labelPos: { x: 0.8885, y: 0.412 } },
    ],
  },

  "collect-send-email-goodbye": {
    id: "collect-send-email-goodbye",
    section: "collect",
    kind: "dialogue",
    text: "I'll send over that email shortly. It was great to meet you, have a great rest of your day.",
    box: box(0.9277, 0.4268, 0.0310, 0.0177),
    next: "collect-lead-set",
    options: [{ label: "Continue", target: "collect-lead-set" }],
  },

  "collect-lead-set": {
    id: "collect-lead-set",
    section: "collect",
    kind: "dialogue",
    eyebrow: "Outcome",
    text: "**LEAD SET!**",
    box: box(0.9617, 0.4268, 0.0395, 0.0408),
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
    box: box(0.9903, 0.3939, 0.0157, 0.0286),
    options: [],
  },

  "collect-note-upload-crm": {
    id: "collect-note-upload-crm",
    section: "collect",
    kind: "dialogue",
    eyebrow: "Next step",
    text: "Upload to CRM.",
    box: box(0.9903, 0.4256, 0.0157, 0.0286),
    options: [],
  },

  "collect-note-brag-chat": {
    id: "collect-note-brag-chat",
    section: "collect",
    kind: "dialogue",
    eyebrow: "Next step",
    text: "Brag in chat that you set a lead.",
    box: box(0.9910, 0.4554, 0.0170, 0.0298),
    options: [],
  },
};
