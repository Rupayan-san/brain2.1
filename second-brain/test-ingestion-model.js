const dotenv = require("dotenv");
dotenv.config({ path: "./backend/.env" });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testIngestionModel() {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  try {
    console.log("Testing Ingestion Model...");
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-lite-preview-02-05" });
    await model.generateContent("Hello");
    console.log("Ingestion Model OK");
  } catch(e) {
    console.log("Ingestion Model Error:", e.statusText || e.message);
  }
}
testIngestionModel();
