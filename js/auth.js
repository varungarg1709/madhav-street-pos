function isLoggedIn() {
  const token =
    sessionStorage.getItem("ms_token") ||
    localStorage.getItem("ms_token");

  return !!token;
}

async function doLogin() {

  const btn = document.getElementById("loginBtn");
  btn.disabled = true;
  btn.innerText = "Logging in...";

  const user =
    (document.getElementById("loginUsername")?.value || "")
      .toString()
      .trim();

  const pass =
    document.getElementById("loginPassword")?.value || "";

  if (!user || !pass) {
    document.getElementById("loginError").innerText =
      "Enter username & password";
    return;
  }

  try {

    const formData = new FormData();
    formData.append("mode", "login");
    formData.append("username", user);
    formData.append("password", pass);

    const res = await fetch(CONFIG.scriptURL, {
      method: "POST",
      body: formData
    });

    const result = await res.json();

    if (!result.success) {
      document.getElementById("loginError").innerText =
        "Invalid username or password";
      btn.disabled = false;
      btn.innerText = "Login";
      return;
    }

    // ⭐ ROLE MUST BE DECLARED FIRST
    const role = result.role || "staff";
    const token =
      result.sessionToken ||
      result.token ||
      "";

    const remember =
      document.getElementById("rememberMe")?.checked;

    // ---------- SESSION (always) ----------
    sessionStorage.setItem("ms_login", "1");
    sessionStorage.setItem("ms_token", token);
    sessionStorage.setItem("ms_role", role);

    // ---------- REMEMBER ME ----------
    if (remember) {
      localStorage.setItem("ms_login", "1");
      localStorage.setItem("ms_token", token);
      localStorage.setItem("ms_role", role);
      localStorage.setItem("ms_remember", "1");
    } else {
      localStorage.removeItem("ms_login");
      localStorage.removeItem("ms_token");
      localStorage.removeItem("ms_role");
      localStorage.removeItem("ms_remember");
    }

    // ---------- UI ----------
    document.getElementById("loginScreen")?.remove();

    const app =
      document.querySelector(".app-layout");

    if (app) app.style.display = "flex";

    startApp();

  } catch (err) {
    btn.disabled = false;
    btn.innerText = "Login";
    console.error("Login error:", err);

    document.getElementById("loginError").innerText =
      "Login failed. Check connection.";
  }
}

function logout() {

  sessionStorage.clear();

  localStorage.removeItem("ms_login");
  localStorage.removeItem("ms_token");
  localStorage.removeItem("ms_remember");
  localStorage.removeItem("ms_role");

  location.reload();
}

/* ================= ROLE HELPERS ================= */

function getCurrentRole() {
  return (
    sessionStorage.getItem("ms_role") ||
    localStorage.getItem("ms_role") ||
    "guest"
  );
}

function hasRole(required) {
  const role = getCurrentRole();

  if (!required) return false;

  if (Array.isArray(required))
    return required.includes(role);

  return role === required;
}

window.getCurrentRole = getCurrentRole;
window.hasRole = hasRole;

function forceLogout(){

  sessionStorage.clear();

  localStorage.removeItem("ms_login");
  localStorage.removeItem("ms_token");
  localStorage.removeItem("ms_role");
  localStorage.removeItem("ms_remember");

  alert("Session expired. Please login again.");

  location.reload();
}

window.forceLogout = forceLogout;

/* ================= LOGIN UI ================= */

function initLoginUI(){

  const pwd = document.getElementById("loginPassword");
  const btn = document.getElementById("showPasswordBtn");
  const field = document.getElementById("pwdField");

  if(!pwd || !btn || !field) return;

  btn.addEventListener("click", () => {

    const hidden = pwd.type === "password";

    pwd.type = hidden ? "text" : "password";

    field.classList.toggle("showing", hidden);

  });

  // restore remember-me
  try {

    if(localStorage.getItem("ms_remember") === "1"){

      const rem = document.getElementById("rememberMe");

      if(rem) rem.checked = true;

    }

  } catch(err){}

}