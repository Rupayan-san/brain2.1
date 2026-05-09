import { HydratedDocument, InferSchemaType, Schema, Types, model } from "mongoose";

const commitmentSchema = new Schema({
  userId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  documentId: {
    type: Types.ObjectId,
    ref: "Document",
    required: true,
    index: true
  },
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
  },
  fulfilledAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export type Commitment = InferSchemaType<typeof commitmentSchema>;
export type CommitmentDocument = HydratedDocument<Commitment>;

export default model<Commitment>("Commitment", commitmentSchema);
