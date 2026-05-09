import { HydratedDocument, InferSchemaType, Schema, Types, model } from "mongoose";

const digestSchema = new Schema({
  userId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ["daily", "weekly"],
    required: true,
    index: true
  },
  narrative: {
    type: String,
    required: true
  },
  sourceDocIds: {
    type: [
      {
        type: Types.ObjectId,
        ref: "Document"
      }
    ],
    default: []
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export type Digest = InferSchemaType<typeof digestSchema>;
export type DigestDocument = HydratedDocument<Digest>;

export default model<Digest>("Digest", digestSchema);
