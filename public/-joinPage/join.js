window.onload = () => {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      join();
    }
  });

  //change page if logged in
  if (sessionStorage.getItem("loggedIn") == "True") {
    var password = sessionStorage.getItem("password");
    var email = sessionStorage.getItem("email");

    document.getElementById("logIn").style.display = "None";
    document.getElementById("signUp").style.display = "None";
    document.getElementById("logOut").style.display = "Inline";
    document.getElementById("profile").style.display = "Inline";

    //get name
    fetch("/getInfo?email=" + email + "&password=" + password, {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => {
        sessionStorage.setItem("firstName", data.first);
        sessionStorage.setItem("lastName", data.last);
        document.getElementById("welcome").innerHTML =
          "Welcome " + sessionStorage.getItem("firstName") + "!";
      })
      .catch((error) => console.log(error));
  }
};

//get center of inputed element
function getCenterOfElement(element) {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

//display menu to chnage info
function nameChangeMenu() {
  const center = getCenterOfElement(document.getElementById("profile"));

  document.getElementById("name-change").style.top = `${center.y + 30}px`;
  document.getElementById("name-change").style.left = `${center.x}px`;

  document.getElementById("first_name").value = "";
  document.getElementById("last_name").value = "";
  document.getElementById("email").value = "";
  document.getElementById("password").value = "";

  if (document.getElementById("name-change").style.display == "none") {
    document.getElementById("name-change").style.display = "flex";
  } else {
    document.getElementById("name-change").style.display = "none";
  }
}

//submit the form to change info
function submitNameChange() {
  var firstName = document.getElementById("first_name").value;
  var lastName = document.getElementById("last_name").value;
  var new_email = document.getElementById("email").value;
  var new_password = document.getElementById("password").value;

  if (firstName == "") {
    firstName = sessionStorage.getItem("firstName");
  }
  if (lastName == "") {
    lastName = sessionStorage.getItem("lastName");
  }
  if (new_email == "") {
    new_email = sessionStorage.getItem("email");
  }
  if (new_password == "") {
    new_password = sessionStorage.getItem("password");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(new_email)) {
    email = sessionStorage.getItem("email");
    password = sessionStorage.getItem("password");

    let result = betterConfirm(
      `New information ok?\n------------------------------\nFirst name: ${firstName}\nLast name: ${lastName}\nEmail: ${new_email}\nPassword: ${new_password}`
    );

    if (result) {
      fetch("/changeInfo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          new_email,
          new_password,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            betterAlert(data.error);
          } else {
            console.log("Info changed successfully");
            sessionStorage.setItem("firstName", firstName);
            sessionStorage.setItem("lastName", lastName);
            sessionStorage.setItem("email", new_email);
            sessionStorage.setItem("password", new_password);
            document.getElementById("first_name").value = "";
            document.getElementById("last_name").value = "";
            document.getElementById("email").value = "";
            document.getElementById("password").value = "";
            location.reload();
          }
        })
        .catch((error) => {
          betterAlert("An error occurred while chaning info");
          console.error("Error:", error.message);
        });
    }
  } else {
    betterAlert("Error: Invalid email");
  }
}

//submit info for room and get sent to join
function join() {
  if (sessionStorage.getItem("loggedIn") == "True") {
    var firstName = sessionStorage.getItem("firstName");
    var lastName = sessionStorage.getItem("lastName");
  } else {
    var firstName = prompt(
      "Since you are not signed in please enter your first name:"
    );
    sessionStorage.setItem("firstName", firstName);
    var lastName = prompt(
      "Since you are not signed in please enter your last name:"
    );
    sessionStorage.setItem("lastName", lastName);
  }

  if (firstName && lastName) {
    var code = document.getElementById("input").value;
    var password = document.getElementById("roomPassword").value;

    sessionStorage.setItem("code", code);
    sessionStorage.setItem("roomPassword", password);

    window.location.href = "../-codeSyncPage/codeSync.html";

    // fetch("/joinCodeSync", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     code,
    //     password,
    //     firstName,
    //     lastName,
    //   }),
    // })
    //   .then((response) => response.json())
    //   .then((data) => {
    //     if (data.error) {
    //       betterAlert(data.error);
    //     } else {
    //       sessionStorage.setItem("code", code);
    //       sessionStorage.setItem("roomPassword", password);
    //       sessionStorage.setItem("language", data.language);
    //     }
    //   })
    //   .catch((error) => {
    //     betterAlert("An error occurred while joining CodeSync");
    //     console.error("Error:", error.message);
    //   });
  } else {
    betterAlert("Please enter both a first and last name");
  }
}

function joinByLink() {
  const link = betterPrompt("Enter the join link:");
  if (link != null) {
    window.location.href = link;
  }
}

//logout of website
function logOut() {
  sessionStorage.clear();
  location.reload();
}
