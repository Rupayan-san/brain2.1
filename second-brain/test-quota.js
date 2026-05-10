const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkQuota() {
  try {
    const ai = new GoogleGenerativeAI("AIzaSyBo2R3bRk_KTtaeskI4SeLF_muOnrkmv_M");
    const chatModel = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const embedModel = ai.getGenerativeModel({ model: "gemini-embedding-2" });

    console.log("Testing Chat Model...");
    await chatModel.generateContent("Hello");
    console.log("Chat Model OK!");

    console.log("Testing Embedding Model...");
    await embedModel.embedContent("Hello");
    console.log("Embedding Model OK!");
  } catch(e) {
    console.log("ERROR:");
    console.log(e.message.substring(0, 500));
  }
}
checkQuota();
