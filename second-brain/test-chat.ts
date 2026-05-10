import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./backend/.env" });
import { ragChat } from "./backend/src/services/ragService";

async function testChat() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  try {
    const res = await ragChat("Hello", "69ff5371656e9f6877af804e", []);
    console.log("Chat Response:", res.content);
  } catch(e) {
    console.error("Chat Error:", e);
  }
  process.exit(0);
}
testChat();
