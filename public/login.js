function togglePassword() {
  var passwordInput = document.getElementById("password");
  var showPasswordCheckbox = document.getElementById("showPassword");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    showPasswordCheckbox.src = "assets/show.png";
  } else {
    passwordInput.type = "password";
    showPasswordCheckbox.src = "assets/hide.png";
  }
}

function sendInfo(email, password) {
  fetch("/signIn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        alert(data.error);
      } else {
        console.log("Signed in successfully");
        sessionStorage.setItem("loggedIn", "True");
        console.log(sessionStorage.getItem("loggedIn"));
        sessionStorage.setItem("email", email);
        sessionStorage.setItem("password", password);
        changePage("index");
      }
    })
    .catch((error) => {
      alert("An error occurred while signing in");
      console.error("Error:", error.message);
    });
}

function signIn() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  sendInfo("cory.pearl99@gmail.com", "plaza0757fly977dog");

  // if (email && password) {
  //   sendInfo(email, password);
  // } else {
  //   alert("All feilds requierd");
  // }
}

function changePage(page) {
  window.location.href = page + ".html";
}

document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    signIn();
  }
});
