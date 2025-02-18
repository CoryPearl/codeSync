var passwordInput = document.getElementById("password");
var passwordInput2 = document.getElementById("confirm_password");
var showPasswordCheckbox = document.getElementById("showPassword");
var timeLeft = 60;

//additiong function to toggle weather password is shown or hidden
function togglePassword() {
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    passwordInput2.type = "text";
    showPasswordCheckbox.src = "assets/show.png";
  } else {
    passwordInput.type = "password";
    passwordInput2.type = "password";
    showPasswordCheckbox.src = "assets/hide.png";
  }
}

//send info to server to get auth code
function sendInfo(firstName, lastName, email, password) {
  fetch("/send2fa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, email }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        newAlert(data.error);
      } else {
        document.getElementById("authCode").style.display = "inline";
        document.getElementById("authButton").style.display = "inline";
        document.getElementById("timer").style.display = "inline";
        document.getElementById("warning").style.display = "inline";
        var timer = setInterval(function () {
          timeLeft -= 1;
          document.getElementById(
            "timer"
          ).innerHTML = `Expires in ${timeLeft} sec`;
        }, 1000);
        newAlert("An authentication code has been emailed to you!");
      }
    })
    .catch((error) => {
      newAlert("An error occurred while creating the account.");
      console.error("Error:", error.message);
    });
}

//change page function
function changePage(page) {
  window.location.href = page + ".html";
}

//submit form
function goToSignIn() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const firstName = document.getElementById("first_name").value;
  const lastName = document.getElementById("last_name").value;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (passwordInput.value == passwordInput2.value && firstName && lastName) {
    if (emailRegex.test(email)) {
      if (email && password && firstName && lastName) {
        sendInfo(firstName, lastName, email, password);
      } else {
        newAlert("All feilds requierd");
      }
    } else {
      newAlert("Invalid email");
    }
  } else {
    newAlert("Passwords do not match");
  }
}

//authenticate code with server
function authenticate() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const firstName = document.getElementById("first_name").value;
  const lastName = document.getElementById("last_name").value;

  var authCode = document.getElementById("authCode").value;
  if (authCode) {
    fetch("/check2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authCode, email }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          newAlert(data.error);
        } else {
          console.log(data);
          if (data.success) {
            fetch("/createAccount", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                firstName,
                lastName,
                email,
                password,
              }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.error) {
                  newAlert(data.error);
                } else {
                  console.log("Account created successfully");
                  changePage("login");
                }
              })
              .catch((error) => {
                newAlert("An error occurred while creating the account.");
                console.error("Error:", error.message);
              });
          } else {
            newAlert("Wrong code please try again");
          }
        }
      })
      .catch((error) => {
        newAlert("An error occurred while creating the account.");
        console.error("Error:", error.message);
      });
  }
}

//enter key submits form
document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    goToSignIn();
  }
});
