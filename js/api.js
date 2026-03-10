/* ================= UNIVERSAL API ENGINE ================= */

async function postAPI(mode, payload = {}) {

  try {

    const formData = new FormData();

    // required fields
    formData.append("mode", mode);
    formData.append("apiKey", CONFIG.apiKey);
    formData.append("token", getAuthToken());

    // attach payload fields
    Object.keys(payload).forEach(key => {
      formData.append(key, payload[key]);
    });

    const resp = await fetch(CONFIG.scriptURL, {
      method: "POST",
      body: formData
    });

    const text = await resp.text();

    // 🔐 Unauthorized handling (GLOBAL)
    if ((text || "").toLowerCase().includes("unauthorized")) {
      console.warn("Session expired");
      forceLogout();
      return null;
    }

    // try JSON parse
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }

  } catch (err) {
    console.error("API Error:", err);
    showToast("Network error", { type: "error" });
    return null;
  }
}

window.postAPI = postAPI;