export const modules = [
  { id: "intro", number: 1, title: "Intro", component: "intro" },
  { id: "scripts", number: 2, title: "Opening the Call", component: "opening_call" },
  { id: "objections", number: 3, title: "Handling Objections", component: "objections" },
  { id: "closing", number: 4, title: "Closing", component: "closing" },
  { id: "mindset", number: 5, title: "The Inner Game of Cold Calling", component: "mindset" },
  { id: "operations", number: 6, title: "Operational Excellence", component: "operations" },
  { id: "signoff", number: 7, title: "Standard of Performance", component: "signoff" },
] as const;

export const trainingLabs = [
  {
    id: "script",
    title: "The Script",
    description: "Keep the full cold-call framework close at hand.",
    icon: "scroll",
  },
  {
    id: "calls",
    title: "Call Library",
    description: "Study timestamped calls and coaching notes.",
    icon: "headphones",
  },
  {
    id: "tools",
    title: "Tools & Systems",
    description: "Training videos on our software and prospecting workflows.",
    icon: "wrench",
  },
  {
    id: "decision-tree",
    title: "Cold Call Decision Tree",
    description: "Explore the complete cold-call workflow from opener to outcome.",
    icon: "git",
  },
] as const;
