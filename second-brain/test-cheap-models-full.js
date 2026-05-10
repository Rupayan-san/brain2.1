const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config({ path: "./backend/.env" });

async function listModels() {
  try {
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = ["gemini-1.5-flash-8b", "gemini-2.5-flash"];
    
    for (const m of models) {
      try {
        const model = ai.getGenerativeModel({ model: m });
        await model.generateContent("hello");
        console.log(m + " OK");
      } catch(e) {
        console.log(m + " ERROR: " + e.message);
      }
    }
  } catch(e) {
    console.error(e);
  }
}
listModels();
