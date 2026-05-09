import { HydratedDocument, InferSchemaType, Schema, Types, model } from "mongoose";

const meetingBriefSchema = new Schema({
  userId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  meetingTitle: {
    type: String,
    required: true,
    trim: true
  },
  meetingTime: {
    type: Date,
    required: true,
    index: true
  },
  attendees: {
    type: [String],
    default: []
  },
  relevantDocs: {
    type: [
      {
        type: Types.ObjectId,
        ref: "Document"
      }
    ],
    default: []
  },
  briefContent: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export type MeetingBrief = InferSchemaType<typeof meetingBriefSchema>;
export type MeetingBriefDocument = HydratedDocument<MeetingBrief>;

export default model<MeetingBrief>("MeetingBrief", meetingBriefSchema);
