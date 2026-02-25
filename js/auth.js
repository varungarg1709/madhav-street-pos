function isLoggedIn() {
  return sessionStorage.getItem("ms_login") === "1";
}

async function doLogin() {

  const pass =
    document.getElementById("loginPassword").value;

  const res = await fetch(CONFIG.scriptURL, {
    method: "POST",
    body: JSON.stringify({
      mode: "login",
      password: pass
    })
  });

  const result = await res.json();

  if (result.success) {

    // SAVE LOGIN STATE
    sessionStorage.setItem("ms_login", "1");

    // SAVE TOKEN (IMPORTANT)
    sessionStorage.setItem("ms_token", result.token);

    document.getElementById("loginScreen")?.remove();

    document.querySelector(".app-layout")
      .style.display = "flex";

    startApp();

  } else {

    document.getElementById("loginError")
      .innerText = "Invalid password";
  }
}

function logout() {
  sessionStorage.clear();
  location.reload();
}