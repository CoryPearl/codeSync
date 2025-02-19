//additiong function to toggle weather password is shown or hidden
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

//sending inputed info to server to verify
function sendInfo(email, password) {
  fetch("/signIn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        betterAlert(data.error);
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
      betterAlert("An error occurred while signing in");
      console.error("Error:", error.message);
    });
}

//just seperating it into two functions to add the ability of auto login for decelopment
function signIn() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (email && password) {
    sendInfo(email, password);
  } else {
    betterAlert("All feilds requierd");
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    sendInfo("cory.pearl99@gmail.com", "plaza0757fly977dog");
  }
});

//switch to other page function
function changePage(page) {
  window.location.href = page + ".html";
}

//enter key subimts
document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    signIn();
  }
});
