import mongoose, { Schema } from "mongoose";

const roundSchema = new Schema(
  {
    roundId: { type: String, unique: true, required: true, index: true },
    sessionTokenHash: { type: String, required: true, index: true },
    idempotencyKey: String,
    targetId: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "prepared",
        "active",
        "submitted",
        "scoring",
        "completed",
        "expired",
        "failed",
      ],
      default: "prepared",
      index: true,
    },
    startedAt: Date,
    deadlineAt: Date,
    submittedAt: Date,
    playerPrompt: { type: String, maxlength: 2000 },
    scoringVersion: String,
    promptEvaluation: Schema.Types.Mixed,
    generatedImage: Schema.Types.Mixed,
    visualEvaluation: Schema.Types.Mixed,
    finalScore: Number,
    scoreMode: { type: String, enum: ["prompt_only", "combined"] },
    failureCode: String,
  },
  { timestamps: true, versionKey: false },
);
roundSchema.index(
  { sessionTokenHash: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);

export const Round: mongoose.Model<any> =
  mongoose.models.Round ?? mongoose.model("Round", roundSchema);
