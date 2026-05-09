import { HydratedDocument, InferSchemaType, Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    profilePicture: {
      type: String
    },
    googleAccessToken: {
      type: String
    },
    googleRefreshToken: {
      type: String
    },
    slackAccessToken: {
      type: String
    },
    slackTeamId: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    id: false
  }
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;

export default model<User>("User", userSchema);
