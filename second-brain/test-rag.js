const dotenv = require("dotenv");
dotenv.config({ path: "./backend/.env" });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testRAG() {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  try {
    console.log("Testing Embedding...");
    const embedModel = ai.getGenerativeModel({ model: "gemini-embedding-2" });
    await embedModel.embedContent("Hello");
    console.log("Embedding OK");
  } catch(e) {
    console.log("Embedding Error:", e.statusText || e.message);
  }

  try {
    console.log("Testing Chat Stream...");
    const chatModel = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const streamResult = await chatModel.generateContentStream("Hello");
    for await (const chunk of streamResult.stream) {
      process.stdout.write(chunk.text());
    }
    console.log("\\nStream OK");
  } catch(e) {
    console.log("\\nStream Error:", e.statusText || e.message);
  }
}
testRAG();
