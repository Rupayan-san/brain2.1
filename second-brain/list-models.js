const https = require("https");
https.get("https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyBo2R3bRk_KTtaeskI4SeLF_muOnrkmv_M", (res) => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.models) {
        parsed.models.forEach(m => console.log(m.name));
      } else {
        console.log(parsed);
      }
    } catch(e) {
      console.log(data);
    }
  });
});
