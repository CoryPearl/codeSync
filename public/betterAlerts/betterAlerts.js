function betterAlert(message) {
  const alert = document.createElement("div");
  const text = document.createElement("p");

  text.innerText = message;
  alert.appendChild(text);
  alert.style.position = "absolute";
  alert.style.top = "10%";
  alert.style.left = "50%";
  alert.style.transform = "translate(-50%, -50%)";
  alert.style.borderRadius = "10px";
  alert.style.padding = "10px";
  alert.style.display = "flex";
  alert.style.justifyContent = "center";
  alert.style.alignItems = "center";
  alert.style.width = "25%";
  alert.style.height = "100px";
  alert.style.backgroundColor = "rgb(72, 72, 72)";
  alert.style.zIndex = "9999";
  alert.style.color = "white";
  alert.style.fontSize = "20px";
  alert.style.fontFamily = "Arial, sans-serif";
  document.body.appendChild(alert);
  alert.style.opacity = "0";
  alert.style.transition = "opacity 0.5s";
  document.body.appendChild(alert);

  setTimeout(() => {
    alert.style.opacity = "1";
  }, 10);

  setTimeout(() => {
    alert.style.opacity = "0";
    setTimeout(() => {
      alert.remove();
    }, 500);
  }, 1500);
}

function betterConfirm(message) {
  const alert = document.createElement("div");
  const text = document.createElement("p");
  const buttons = document.createElement("div");
  const yes = document.createElement("button");
  const no = document.createElement("button");

  alert.appendChild(text);
  alert.appendChild(buttons);
  buttons.appendChild(yes);
  buttons.appendChild(no);

  alert.style.position = "absolute";
  alert.style.height = "auto";
  alert.style.top = "15%";
  alert.style.left = "50%";
  alert.style.transform = "translate(-50%, -50%)";
  alert.style.borderRadius = "10px";
  alert.style.padding = "10px";
  alert.style.display = "flex";
  alert.style.justifyContent = "center";
  alert.style.alignItems = "center";
  alert.style.flexDirection = "column";
  alert.style.width = "25%";
  alert.style.backgroundColor = "rgb(72, 72, 72)";
  alert.style.zIndex = "9999";
  alert.style.color = "white";
  alert.style.fontSize = "20px";
  alert.style.fontFamily = "Arial, sans-serif";
  alert.style.opacity = "0";
  alert.style.transition = "opacity 0.5s";
  document.body.appendChild(alert);

  buttons.style.display = "flex";
  buttons.style.justifyContent = "space-between";
  buttons.style.width = "50%";
  buttons.style.marginTop = "10px";
  yes.style.backgroundColor = "rgb(6, 186, 12)";
  no.style.backgroundColor = "rgb(209, 56, 56)";
  yes.style.border = "0px";
  no.style.border = "0px";
  yes.style.marginRight = "5px";
  no.style.marginLeft = "5px";
  yes.style.color = "white";
  no.style.color = "white";
  yes.style.width = "50%";
  no.style.width = "50%";
  yes.style.height = "40px";
  no.style.height = "40px";
  yes.style.borderRadius = "5px";
  no.style.borderRadius = "5px";
  yes.style.cursor = "pointer";
  no.style.cursor = "pointer";
  yes.innerText = "Yes";
  no.innerText = "No";
  text.innerText = message;

  setTimeout(() => {
    alert.style.opacity = "1";
  }, 10);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      yes.click();
    }
  });

  yes.addEventListener("click", function (e) {
    alert.style.opacity = "0";
    setTimeout(() => {
      alert.remove();
    }, 500);
    return true;
  });

  no.addEventListener("click", function (e) {
    alert.style.opacity = "0";
    setTimeout(() => {
      alert.remove();
    }, 500);
    return false;
  });
}

function betterPrompt(message) {
  const alert = document.createElement("div");
  const text = document.createElement("p");
  const input = document.createElement("input");
  const buttons = document.createElement("div");
  const submit = document.createElement("button");
  const cancel = document.createElement("button");

  alert.appendChild(text);
  alert.appendChild(input);
  alert.appendChild(buttons);
  buttons.appendChild(submit);
  buttons.appendChild(cancel);

  alert.style.position = "absolute";
  alert.style.top = "10%";
  alert.style.left = "50%";
  alert.style.transform = "translate(-50%, -50%)";
  alert.style.borderRadius = "10px";
  alert.style.padding = "10px";
  alert.style.display = "flex";
  alert.style.justifyContent = "center";
  alert.style.alignItems = "center";
  alert.style.flexDirection = "column";
  alert.style.width = "25%";
  alert.style.height = "150px";
  alert.style.backgroundColor = "rgb(72, 72, 72)";
  alert.style.zIndex = "9999";
  alert.style.color = "white";
  alert.style.fontSize = "20px";
  alert.style.fontFamily = "Arial, sans-serif";
  alert.style.opacity = "0";
  alert.style.transition = "opacity 0.5s";
  document.body.appendChild(alert);

  buttons.style.display = "flex";
  buttons.style.justifyContent = "space-between";
  buttons.style.width = "50%";
  buttons.style.marginTop = "10px";
  submit.style.backgroundColor = "rgb(6, 186, 12)";
  cancel.style.backgroundColor = "rgb(209, 56, 56)";
  submit.style.border = "0px";
  cancel.style.border = "0px";
  submit.style.marginRight = "5px";
  cancel.style.marginLeft = "5px";
  submit.style.color = "white";
  cancel.style.color = "white";
  submit.style.width = "50%";
  cancel.style.width = "50%";
  submit.style.height = "40px";
  cancel.style.height = "40px";
  submit.style.borderRadius = "5px";
  cancel.style.borderRadius = "5px";
  submit.style.cursor = "pointer";
  cancel.style.cursor = "pointer";
  submit.innerText = "Submit";
  cancel.innerText = "Cancel";
  text.innerText = message;

  setTimeout(() => {
    alert.style.opacity = "1";
  }, 10);

  submit.addEventListener("click", function () {
    const userInput = input.value;
    alert.style.opacity = "0";
    setTimeout(() => {
      alert.remove();
      return userInput;
    }, 500);
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      submit.click();
    }
  });

  cancel.addEventListener("click", function () {
    alert.style.opacity = "0";
    setTimeout(() => {
      alert.remove();
      return null;
    }, 500);
  });
}
