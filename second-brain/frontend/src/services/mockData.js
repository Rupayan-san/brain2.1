export const fallbackDocuments = [
  {
    _id: "doc-gmail-1",
    source: "gmail",
    summary: "Maya confirmed the Q3 research review and asked for a shortlist of customer themes before Friday.",
    createdAt: new Date().toISOString(),
    tags: ["research", "customers"],
    entities: [
      { name: "Maya", type: "person" },
      { name: "Q3 research", type: "topic" }
    ],
    actionItems: ["Send customer theme shortlist"],
    commitments: [{ text: "Send customer theme shortlist", person: "You", dueDate: new Date().toISOString(), fulfilled: false }]
  },
  {
    _id: "doc-slack-1",
    source: "slack",
    summary: "The product channel converged on keeping the beta invite flow private until onboarding copy is finished.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    tags: ["beta", "onboarding"],
    entities: [
      { name: "beta invite flow", type: "topic" },
      { name: "onboarding copy", type: "topic" }
    ],
    actionItems: ["Finalize onboarding copy"],
    commitments: []
  },
  {
    _id: "doc-gmail-2",
    source: "gmail",
    summary: "Ravi shared notes from last week's architecture discussion and flagged the vector search rollout as stale.",
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ["architecture", "search"],
    entities: [
      { name: "Ravi", type: "person" },
      { name: "vector search", type: "topic" }
    ],
    actionItems: [],
    commitments: []
  }
];

export const fallbackCommitments = [
  {
    _id: "commit-1",
    text: "Send customer theme shortlist",
    person: "You",
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    fulfilled: false
  },
  {
    _id: "commit-2",
    text: "Finalize onboarding copy",
    person: "Sam",
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    fulfilled: false
  }
];

export const fallbackDigest = {
  daily: {
    narrative:
      "The main theme today is narrowing scattered team input into concrete product decisions. Your messages point toward customer research, onboarding clarity, and a few commitments that need follow-through before the next review.",
    sourceDocIds: ["doc-gmail-1", "doc-slack-1"]
  },
  weekly: {
    narrative:
      "The main theme this week is turning a broad second-brain system into an operational workflow. Research notes, product decisions, and architecture threads are starting to converge, but the stale search rollout and unfinished onboarding copy remain the open loops to watch.",
    sourceDocIds: ["doc-gmail-1", "doc-slack-1", "doc-gmail-2"]
  }
};
