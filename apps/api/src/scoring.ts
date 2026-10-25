import type { TargetAttribute } from "./targets.js";

export type Judgment = "matched" | "partial" | "missed" | "contradicted";
export type JudgedAttribute = {
  attributeId: string;
  judgment: Judgment;
  reason: string;
};
export type PromptEvaluation = {
  score: number;
  attributes: JudgedAttribute[];
  feedback: string;
  modelId: string;
};

export function calculateScore(
  attributes: TargetAttribute[],
  judgments: JudgedAttribute[],
): number {
  const byId = new Map(
    judgments.map((item) => [item.attributeId, item.judgment]),
  );
  const weightTotal = attributes.reduce((sum, item) => sum + item.weight, 0);
  if (weightTotal !== 100)
    throw new Error("Target attribute weights must total 100");
  const raw = attributes.reduce(
    (sum, item) =>
      sum +
      item.weight *
        (byId.get(item.id) === "matched"
          ? 1
          : byId.get(item.id) === "partial"
            ? 0.5
            : 0),
    0,
  );
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function evaluateMock(
  prompt: string,
  attributes: TargetAttribute[],
): PromptEvaluation {
  const text = prompt.toLocaleLowerCase();
  const judged = attributes.map((attribute): JudgedAttribute => {
    const terms = [attribute.description, ...attribute.expectedVariants]
      .flatMap((term) => term.toLocaleLowerCase().split(/[^a-z0-9]+/))
      .filter((term) => term.length > 2);
    const found = [...new Set(terms)].filter((term) => text.includes(term));
    const ratio = terms.length ? found.length / new Set(terms).size : 0;
    const judgment: Judgment =
      ratio >= 0.45 ? "matched" : ratio > 0 ? "partial" : "missed";
    return {
      attributeId: attribute.id,
      judgment,
      reason:
        judgment === "missed"
          ? "This detail was not clear in the description."
          : "Your description included details related to this attribute.",
    };
  });
  return {
    score: calculateScore(attributes, judged),
    attributes: judged,
    feedback:
      "Focus on the main subject, its color, and how it relates to the setting. Scores are estimates.",
    modelId: "mock-rubric-v1",
  };
}
