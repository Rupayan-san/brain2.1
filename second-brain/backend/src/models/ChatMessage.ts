import { HydratedDocument, InferSchemaType, Schema, Types, model } from "mongoose";

const chatMessageSchema = new Schema({
  userId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  sources: {
    type: [
      {
        type: Types.ObjectId,
        ref: "Document"
      }
    ],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export type ChatMessage = InferSchemaType<typeof chatMessageSchema>;
export type ChatMessageDocument = HydratedDocument<ChatMessage>;

export default model<ChatMessage>("ChatMessage", chatMessageSchema);
