const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./backend/.env" });
const { ragChat } = require("./backend/dist/services/ragService");

async function testChat() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const res = await ragChat("Hello", "69ff5371656e9f6877af804e", []);
    console.log("Chat Response:", res.content);
  } catch(e) {
    console.error("Chat Error:", e);
  }
  process.exit(0);
}
testChat();
