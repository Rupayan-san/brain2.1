const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./backend/.env" });
const { fetchGmailMessages, fetchSlackMessages } = require("./backend/dist/services/ingestionService");

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    console.log("Testing Gmail...");
    const gdocs = await fetchGmailMessages("69ff5371656e9f6877af804e");
    console.log("Gmail success! Docs:", gdocs.length);
  } catch(e) {
    console.error("Gmail Error:", e);
  }

  try {
    console.log("Testing Slack...");
    const sdocs = await fetchSlackMessages("69ff5371656e9f6877af804e");
    console.log("Slack success! Docs:", sdocs.length);
  } catch(e) {
    console.error("Slack Error:", e);
  }
  process.exit(0);
}
test();
