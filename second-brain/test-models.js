const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkModels() {
  try {
    const ai = new GoogleGenerativeAI("AIzaSyBo2R3bRk_KTtaeskI4SeLF_muOnrkmv_M");
    // just try a few model names
    const modelsToTest = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro", "gemini-1.0-pro", "gemini-2.0-flash"];
    
    for (const m of modelsToTest) {
      try {
        const model = ai.getGenerativeModel({ model: m });
        await model.generateContent("test");
        console.log(m + " works!");
      } catch (e) {
        console.log(m + " failed: " + e.message);
      }
    }
  } catch(e) {
    console.error(e);
  }
}
checkModels();
