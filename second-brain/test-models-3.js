const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkModels() {
  try {
    const ai = new GoogleGenerativeAI("AIzaSyBo2R3bRk_KTtaeskI4SeLF_muOnrkmv_M");
    const m = "text-embedding-004";
    try {
      const model = ai.getGenerativeModel({ model: m });
      await model.embedContent("test");
      console.log(m + " works!");
    } catch (e) {
      console.log(m + " failed: " + e.message.substring(0, 200));
    }
  } catch(e) {
    console.error(e);
  }
}
checkModels();
