const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkModels() {
  try {
    const ai = new GoogleGenerativeAI("AIzaSyBo2R3bRk_KTtaeskI4SeLF_muOnrkmv_M");
    const modelsToTest = [
      "gemini-2.0-flash",
      "gemini-2.5-pro",
      "gemini-1.5-pro",
      "gemini-1.0-pro",
      "gemini-pro"
    ];
    
    for (const m of modelsToTest) {
      try {
        const model = ai.getGenerativeModel({ model: m });
        await model.generateContent("Hello");
        console.log(m + " works!");
      } catch (e) {
        console.log(m + " failed: " + e.message.split("\\n")[0].substring(0, 80));
      }
    }
  } catch(e) {
    console.error(e);
  }
}
checkModels();
