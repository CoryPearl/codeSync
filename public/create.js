window.onload = () => {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      create();
    }
  });

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

function getCenterOfElement(element) {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

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

    let result = confirm(
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
            alert(data.error);
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
          alert("An error occurred while chaning info");
          console.error("Error:", error.message);
        });
    }
  } else {
    alert("Error: Invalid email");
  }
}

function logOut() {
  sessionStorage.clear();
  location.reload();
}

function create() {
  if (
    sessionStorage.getItem("loggedIn") == "True" &&
    document.getElementById("lang").value != "Please select a language" &&
    document.getElementById("roomPassword").value != ""
  ) {
    var password = document.getElementById("roomPassword").value;
    var language = document.getElementById("lang").value;
    var owner = `${sessionStorage.getItem(
      "firstName"
    )} ${sessionStorage.getItem("lastName")}`;
    var ownerPassword = sessionStorage.getItem("password");
    fetch("/createCodeSync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password,
        language,
        owner,
        ownerPassword,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          alert(data.error);
        } else {
          console.log("CodeSync created successfully");
          console.log("Code: ", data.code);
          sessionStorage.setItem("code", data.code);
          sessionStorage.setItem("roomPassword", password);
          sessionStorage.setItem("language", language);
          window.location.replace("codeSync.html");
        }
      })
      .catch((error) => {
        alert("An error occurred while creating CodeSync");
        console.error("Error:", error.message);
      });
  } else {
    alert("Must be signed in to create a CodeSync or a feild is empty");
  }
}
