const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  try {
    const ai = new GoogleGenerativeAI("AIzaSyDOF6zHMqmROcIhFz3Iu4OUT4VAJ1SFYUM");
    // Unfortunately, the JS SDK doesn't have a direct listModels.
    // Let's test flash-8b
    const models = ["gemini-1.5-flash-8b", "gemini-1.5-flash", "gemini-1.0-pro"];
    
    for (const m of models) {
      try {
        const model = ai.getGenerativeModel({ model: m });
        await model.generateContent("hello");
        console.log(m + " OK");
      } catch(e) {
        console.log(m + " ERROR: " + e.message.substring(0, 50));
      }
    }
  } catch(e) {
    console.error(e);
  }
}
listModels();
