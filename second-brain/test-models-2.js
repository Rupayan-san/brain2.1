const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkModels() {
  try {
    const ai = new GoogleGenerativeAI("AIzaSyBo2R3bRk_KTtaeskI4SeLF_muOnrkmv_M");
    const modelsToTest = ["gemini-2.5-flash", "embedding-001"];
    
    for (const m of modelsToTest) {
      try {
        const model = ai.getGenerativeModel({ model: m });
        if (m === "embedding-001") {
          await model.embedContent("test");
        } else {
          await model.generateContent("test");
        }
        console.log(m + " works!");
      } catch (e) {
        console.log(m + " failed: " + e.message.substring(0, 200));
      }
    }
  } catch(e) {
    console.error(e);
  }
}
checkModels();
