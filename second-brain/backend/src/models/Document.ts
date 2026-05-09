import { HydratedDocument, InferSchemaType, Schema, Types, model } from "mongoose";

const entitySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["person", "date", "topic", "place"],
      required: true
    }
  },
  {
    _id: false
  }
);

const commitmentSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true
    },
    person: {
      type: String,
      trim: true
    },
    dueDate: {
      type: Date
    },
    fulfilled: {
      type: Boolean,
      default: false
    }
  },
  {
    _id: false
  }
);

const documentSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    source: {
      type: String,
      enum: ["gmail", "slack", "notion", "upload"],
      required: true,
      index: true
    },
    sourceId: {
      type: String,
      required: true,
      index: true
    },
    rawContent: {
      type: String,
      required: true
    },
    summary: {
      type: String
    },
    entities: {
      type: [entitySchema],
      default: []
    },
    actionItems: {
      type: [String],
      default: []
    },
    commitments: {
      type: [commitmentSchema],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    embedding: {
      type: [Number],
      default: []
    },
    hasConflict: {
      type: Boolean,
      default: false,
      index: true
    },
    conflictExplanations: {
      type: [String],
      default: []
    },
    conflictDocumentIds: {
      type: [
        {
          type: Types.ObjectId,
          ref: "Document"
        }
      ],
      default: []
    }
  },
  {
    timestamps: true
  }
);

documentSchema.index({ userId: 1, source: 1, sourceId: 1 }, { unique: true });

export type Document = InferSchemaType<typeof documentSchema>;
export type DocumentDocument = HydratedDocument<Document>;

export default model<Document>("Document", documentSchema);
