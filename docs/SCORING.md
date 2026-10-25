# Scoring

## Prompt score

Scores range from 0 to 100. Each approved target has hidden, weighted attributes totaling 100. The evaluator classifies each attribute as `matched`, `partial`, `missed`, or `contradicted`. The server assigns 1.0, 0.5, 0, and 0 credit respectively, multiplies by the attribute weight, sums the result, rounds to an integer, and clamps it to 0–100. Contradictions do not receive a separate penalty in `v1`.

The deterministic local mock scores attribute text for development without paid calls. For configured Gemini evaluation, the API validates structured output, requires exactly one judgment for each expected attribute, and computes the numeric score itself. Gemini currently receives curated target attributes and alt text; passing the target image bytes is a known follow-up.

## Final score mode

The MVP currently runs prompt-only. Its final score equals its prompt score, and results label it **Prompt Score**. If image generation and comparison are enabled in a future version, the specified combined score is `round(0.60 × P + 0.40 × V)`. When visual scoring is unavailable, the score remains `P`; absence of a visual score is not treated as zero.

Every stored result records the scoring version and evaluator model ID. Scores are estimates, not objective truth or a promise of pixel-perfect reproduction.

After scoring is complete, the result also reveals one curated reference description for the target image beside the player's submitted prompt. It is an example of a clear description, not the only acceptable wording or a required exact phrase. Reference descriptions are never included in prepare/start responses.
