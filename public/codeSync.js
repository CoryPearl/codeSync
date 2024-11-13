//declaring a few variables
const socket = io();
var code = sessionStorage.getItem("code");
var password = sessionStorage.getItem("roomPassword");
var firstName = sessionStorage.getItem("firstName");
var lastName = sessionStorage.getItem("lastName");
var owner = false;
var focusStatus = "code";
var localCursorPos = 0;
var htmlExpanded = true;
var cssExpanded = true;
var jsExpanded = true;
let localStream;
const roomId = "voice-chat-room";
let isMuted = false;

//join the code sync when page load
fetch("/joinCodeSync", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    code,
    password,
    firstName,
    lastName,
  }),
})
  .then((response) => response.json())
  .then((data) => {
    if (data.error) {
      alert(data.error);
    } else {
      sessionStorage.setItem("language", data.language);
    }
  })
  .catch((error) => {
    alert("An error occurred while joining CodeSync");
    console.error("Error:", error.message);
  });

window.onload = () => {
  //update codeing space, eventlistners, and output if the room is html/css/js
  checkHtml();
  updateSizes();
  addEventListeners();

  document.getElementById(
    "passwordDisplay"
  ).innerHTML = `Password: ${sessionStorage.getItem("roomPassword")}`;

  socket.emit("connectSocket", { code });

  document.title = `CodeSync | ${sessionStorage.getItem("code")}`;
  document.getElementById(
    "codeDisplay"
  ).innerHTML = `Code: ${sessionStorage.getItem("code")}`;
  document.getElementById(
    "langDisplay"
  ).innerHTML = `Language: ${sessionStorage.getItem("language")}`;

  const name = `${sessionStorage.getItem("firstName")} ${sessionStorage.getItem(
    "lastName"
  )}`;
  const password = sessionStorage.getItem("password");
  socket.emit("checkOwner", { name, password, code });

  addEventListeners();
};

//checking to see weather the person should be able to close the room or only leave it
socket.on("ownerChecked", (data) => {
  if (data) {
    document.getElementById("leaveButton").innerHTML = "Close";
    // document.getElementById(
    //   "passwordDisplay"
    // ).innerHTML = `Password: ${sessionStorage.getItem("roomPassword")}`;
    owner = true;
  }
});

//getting list of active users to display
socket.on("updateUsers", (data) => {
  var toWright = "";

  for (let i = 0; i < Object.keys(data[0]).length; i++) {
    if (i < Object.keys(data[0]).length - 1) {
      toWright += data[0][i] + ", ";
    } else {
      toWright += data[0][i];
    }
  }
  document.getElementById("connectedUsers").innerHTML = toWright;
});

//getting all text data from code spaces
socket.on("roomData", (data) => {
  if (sessionStorage.getItem("language") == "html/css/js") {
    document.getElementById("codeSpace").value = data[0];
    document.getElementById("codeSpaceCSS").value = data[1];
    document.getElementById("codeSpaceJS").value = data[2];
  } else {
    document.getElementById("codeSpace").value = data[0];
  }

  if (sessionStorage.getItem("language") == "html/css/js") {
    updateLines("codeSpace", "lineNumbers");
    updateLines("codeSpaceCSS", "lineNumbersCSS");
    updateLines("codeSpaceJS", "lineNumbersJS");
  } else {
    updateLines("codeSpace", "lineNumbers");
  }

  document.getElementById("codeSpace").selectionStart = localCursorPos;
  document.getElementById("codeSpace").selectionEnd = localCursorPos;
});

socket.on("ownerClosed", () => {
  if (!owner) {
    alert("Room closed by owner, will redirect to home");
    window.location.href = "index.html";
  }
});

//reciveing chat form server and displaying
socket.on("reciveChat", (data) => {
  var name = data[0];
  var chat = data[1];

  const message = document.createElement("p");
  if (
    name ==
    `${sessionStorage.getItem("firstName")} ${sessionStorage.getItem(
      "lastName"
    )}`
  ) {
    message.innerText = `Me: ${chat}`;
  } else {
    message.innerText = `${name}: ${chat}`;
  }

  message.style.width = "100%";
  message.style.textWrap = "wrap";
  message.style.color = "white";
  message.style.paddingLeft = "5px";

  document.getElementById("chats").appendChild(message);
  scrollToChatBottom();
});

//output data recived after running code
socket.on("ranData", (data) => {
  document.getElementById("output").value = data;
});

//Voice chat logic writin by ChatGPT
//-------------------------------------------------------------
const startChat = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });
  socket.emit("join-room", roomId);

  peerConnection = new RTCPeerConnection();
  peerConnection.addStream(localStream);

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("candidate", event.candidate, roomId);
    }
  };

  peerConnection.onaddstream = (event) => {
    const audioElement = document.createElement("audio");
    audioElement.srcObject = event.stream;
    audioElement.autoplay = true;
    document.body.appendChild(audioElement);
  };

  socket.on("offer", async (offer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomId);
  });

  socket.on("answer", (answer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  });

  socket.on("candidate", (candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomId);

  // Enable Stop and Mute buttons
  document.getElementById("stopChat").disabled = false;
  document.getElementById("muteUnmute").disabled = false;
};

const stopChat = () => {
  // Close peer connection and stop audio tracks
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  // Disable Stop and Mute buttons, enable Start Chat button
  document.getElementById("startChat").disabled = false;
  document.getElementById("stopChat").disabled = true;
  document.getElementById("muteUnmute").disabled = true;

  // Clear any remaining audio elements
  document.querySelectorAll("audio").forEach((audio) => audio.remove());
};

const toggleMute = () => {
  if (localStream) {
    isMuted = !isMuted;
    localStream.getAudioTracks()[0].enabled = !isMuted;

    // Update button text based on mute state
    document.getElementById("muteUnmute").textContent = isMuted
      ? "Unmute"
      : "Mute";
  }
};

document.getElementById("startChat").addEventListener("click", () => {
  startChat();
  document.getElementById("startChat").disabled = true;
});
document.getElementById("stopChat").addEventListener("click", stopChat);
document.getElementById("muteUnmute").addEventListener("click", toggleMute);
//------------------------------------------------------------

//checking if code room is in html/css/js and updating it accordingly
function checkHtml() {
  if (sessionStorage.getItem("language") == "html/css/js") {
    document.getElementById("lineNumbers").style.height = "21.3vh";
    document.getElementById("codeSpace").style.height = "20vh";
    document.getElementById("lineNumbersCSS").style.height = "21.3vh";
    document.getElementById("codeSpaceCSS").style.height = "20vh";
    document.getElementById("lineNumbersJS").style.height = "21.3vh";
    document.getElementById("codeSpaceJS").style.height = "20vh";

    document.getElementById("codeSpace").style.borderRadius = "0px";
    document.getElementById("codeSpaceCSS").style.borderRadius = "0px";
    document.getElementById("codeSpaceJS").style.borderRadius = "0px";

    document.getElementById("lineNumbersCSS").style.display = "inline";
    document.getElementById("codeSpaceCSS").style.display = "inline";
    document.getElementById("lineNumbersJS").style.display = "inline";
    document.getElementById("codeSpaceJS").style.display = "inline";
    document.getElementById("htmlButton").style.display = "inline";
    document.getElementById("cssButton").style.display = "inline";
    document.getElementById("jsButton").style.display = "inline";
    document.getElementById("autoRunLabel").style.display = "inline";
    document.getElementById("autoRun").style.display = "inline";

    document.getElementById("output").style.width = "0px";
    document.getElementById("outputFrame").style.width = "49vw";
    document.getElementById("output").style.padding = "0px";
    document.getElementById("output").style.border = "0px";

    updateLines("codeSpace", "lineNumbers");
    updateLines("codeSpaceCSS", "lineNumbersCSS");
    updateLines("codeSpaceJS", "lineNumbersJS");

    window.setInterval(function () {
      if (document.getElementById("autoRun").checked) {
        run();
      }
    }, 10);

    addTextAreaKeys("codeSpaceCSS");
    addTextAreaKeys("codeSpaceJS");

    document
      .getElementById("codeSpaceCSS")
      .addEventListener("input", function (e) {
        sendData();
        updateLines("codeSpaceCSS", "lineNumbersCSS");
      });

    document
      .getElementById("codeSpaceJS")
      .addEventListener("input", function (e) {
        sendData();
        updateLines("codeSpaceJS", "lineNumbersJS");
      });

    document
      .getElementById("htmlButton")
      .addEventListener("click", function (e) {
        if (htmlExpanded) {
          htmlExpanded = false;
          document.getElementById("codeSpace").style.height = "1vh";
          document.getElementById("codeSpace").style.padding = "0.625vh";
          document.getElementById("htmlDiv").style.height = "1vh";
          document.getElementById("lineNumbers").style.height = "2.3vh";
          document.getElementById("htmlButton").innerHTML = "Expand";
          document.getElementById("htmlButton").style.height = "2.5vh";
          document.getElementById("htmlDiv").style.marginBottom = "10px";
        } else {
          htmlExpanded = true;
          document.getElementById("codeSpace").style.padding = "0px";
          document.getElementById("codeSpace").style.paddingLeft = "5px";
          document.getElementById("codeSpace").style.height = "100%";
          document.getElementById("lineNumbers").style.height = "100%";
          document.getElementById("htmlDiv").style.height = "22vh";
          document.getElementById("htmlButton").innerHTML = "Shrink HTML";
          document.getElementById("htmlButton").style.height = "101.25%";
          document.getElementById("htmlDiv").style.marginBottom = "0px";
        }
        updateSizes();
      });

    document
      .getElementById("cssButton")
      .addEventListener("click", function (e) {
        if (cssExpanded) {
          cssExpanded = false;
          document.getElementById("codeSpaceCSS").style.padding = "0.625vh";
          document.getElementById("codeSpaceCSS").style.height = "1vh";
          document.getElementById("cssDiv").style.height = "1vh";
          document.getElementById("lineNumbersCSS").style.height = "2.3vh";
          document.getElementById("cssButton").innerHTML = "Expand";
          document.getElementById("cssButton").style.height = "2.5vh";
          document.getElementById("cssDiv").style.marginBottom = "10px";
        } else {
          cssExpanded = true;
          document.getElementById("codeSpaceCSS").style.padding = "0px";
          document.getElementById("codeSpaceCSS").style.paddingLeft = "5px";
          document.getElementById("codeSpaceCSS").style.height = "100%";
          document.getElementById("lineNumbersCSS").style.height = "100%";
          document.getElementById("cssDiv").style.height = "22vh";
          document.getElementById("cssButton").innerHTML = "Shrink CSS";
          document.getElementById("cssButton").style.height = "101.25%";
          document.getElementById("cssDiv").style.marginBottom = "0px";
        }
        updateSizes();
      });

    document.getElementById("jsButton").addEventListener("click", function (e) {
      if (jsExpanded) {
        jsExpanded = false;
        document.getElementById("codeSpaceJS").style.padding = "0.625vh";
        document.getElementById("codeSpaceJS").style.height = "1vh";
        document.getElementById("jsDiv").style.height = "1vh";
        document.getElementById("lineNumbersJS").style.height = "2.3vh";
        document.getElementById("jsButton").innerHTML = "Expand";
        document.getElementById("jsButton").style.height = "2.5vh";
        document.getElementById("jsDiv").style.marginBottom = "10px";
      } else {
        jsExpanded = true;
        document.getElementById("codeSpaceJS").style.padding = "0px";
        document.getElementById("codeSpaceJS").style.paddingLeft = "5px";
        document.getElementById("codeSpaceJS").style.height = "100%";
        document.getElementById("lineNumbersJS").style.height = "100%";
        document.getElementById("jsDiv").style.height = "22vh";
        document.getElementById("jsButton").innerHTML = "Shrink JS";
        document.getElementById("jsButton").style.height = "101.25%";
        document.getElementById("jsDiv").style.marginBottom = "0px";
      }
      updateSizes();
    });
  } else {
    updateLines("codeSpace", "lineNumbers");
    document.getElementById("codeSpace").style.padding = "5px";
    document
      .getElementById("codeArea")
      .removeChild(document.getElementById("cssDiv"));
    document
      .getElementById("codeArea")
      .removeChild(document.getElementById("jsDiv"));
    document.getElementById("lineNumbers").style.height = "67.3vh";
    document
      .getElementById("htmlDiv")
      .removeChild(document.getElementById("htmlButton"));
    document.getElementById("htmlDiv").style.width = "100%";

    document.getElementById("outputFrame").style.display = "none";
  }
}

//adding keybinds to textareas such as tab and when you tyep ( it auto closes with a )
function addTextAreaKeys(name) {
  document.getElementById(name).addEventListener("keydown", (e) => {
    var textarea = document.getElementById(name);
    const cursorPos = textarea.selectionStart;
    const currentText = textarea.value;

    if (e.key === "(") {
      e.preventDefault();
      textarea.value =
        currentText.slice(0, cursorPos) + "()" + currentText.slice(cursorPos);
      textarea.selectionStart = cursorPos + 1;
      textarea.selectionEnd = cursorPos + 1;
    } else if (e.key === "{") {
      e.preventDefault();
      textarea.value =
        currentText.slice(0, cursorPos) + "{}" + currentText.slice(cursorPos);
      textarea.selectionStart = cursorPos + 1;
      textarea.selectionEnd = cursorPos + 1;
    } else if (e.key === "[") {
      e.preventDefault();
      textarea.value =
        currentText.slice(0, cursorPos) + "[]" + currentText.slice(cursorPos);
      textarea.selectionStart = cursorPos + 1;
      textarea.selectionEnd = cursorPos + 1;
    } else if (e.key === '"') {
      e.preventDefault();
      textarea.value =
        currentText.slice(0, cursorPos) + '""' + currentText.slice(cursorPos);
      textarea.selectionStart = cursorPos + 1;
      textarea.selectionEnd = cursorPos + 1;
    } else if (e.key === "'") {
      e.preventDefault();
      textarea.value =
        currentText.slice(0, cursorPos) + "''" + currentText.slice(cursorPos);
      textarea.selectionStart = cursorPos + 1;
      textarea.selectionEnd = cursorPos + 1;
    } else if (e.key === "Tab") {
      if (e.shiftKey) {
        e.preventDefault();
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;

        textarea.value =
          textarea.value.substring(0, start) +
          "\t" +
          textarea.value.substring(end);

        textarea.selectionStart = textarea.selectionEnd = start + 1;
      } else {
        e.preventDefault();
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;

        textarea.value =
          textarea.value.substring(0, start) +
          "\t" +
          textarea.value.substring(end);

        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }
    }
  });
}

//adding event listners to items
function addEventListeners() {
  document
    .getElementById("leaveButton")
    .addEventListener("click", function (e) {
      leave();
    });

  document.getElementById("codeSpace").addEventListener("input", function (e) {
    sendData();
    updateLines("codeSpace", "lineNumbers");
  });

  document.getElementById("codeSpace").addEventListener("focus", function (e) {
    focusStatus = "code";
  });

  document.getElementById("codeSpace").addEventListener("scroll", function (e) {
    updateScroll();
  });

  document.getElementById("chatInput").addEventListener("input", function (e) {
    focusStatus = "chat";
  });

  document.getElementById("chatSend").addEventListener("click", function (e) {
    sendChat();
  });

  document.getElementById("run").addEventListener("click", function (e) {
    run();
  });

  document
    .getElementById("downloadLink")
    .addEventListener("click", function (e) {
      donwloadText("codeSpace");
      if (sessionStorage.getItem("language") == "html/css/js") {
        donwloadText("codeSpaceCSS");
        donwloadText("codeSpaceJS");
      }
    });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (focusStatus == "chat") {
        e.preventDefault();
        sendChat();
      } else if (focusStatus == "code") {
      }
    }
  });

  addTextAreaKeys("codeSpace");
}

//downlading the working file or files into a txt file
function donwloadText(name) {
  var textToWrite = document.getElementById(name).value;
  var textFileAsBlob = new Blob([textToWrite], { type: "text/plain" });
  var downloadLink = document.createElement("a");

  downloadLink.download = "file";
  downloadLink.innerHTML = "Download File";
  downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
  downloadLink.click();
  downloadLink.remove();
}

//getting all data about the room
function getData() {
  socket.emit("getRoomData", { code });
}

//updating box sizes for html/css/js when someone minimizes or maximizes a size of text box
function updateSizes() {
  if (sessionStorage.getItem("language") == "html/css/js") {
    if (htmlExpanded) {
      document.getElementById("htmlDiv").style.height = "100%";
      document.getElementById("codeSpace").style.height = "100%";
      document.getElementById("lineNumbers").style.height = "100%";
      document.getElementById("htmlButton").style.height = "101.25%";
    }
    if (cssExpanded) {
      document.getElementById("cssDiv").style.height = "100%";
      document.getElementById("codeSpaceCSS").style.height = "100%";
      document.getElementById("lineNumbersCSS").style.height = "100%";
      document.getElementById("cssButton").style.height = "101.25%";
    }
    if (jsExpanded) {
      document.getElementById("jsDiv").style.height = "100%";
      document.getElementById("codeSpaceJS").style.height = "100%";
      document.getElementById("lineNumbersJS").style.height = "100%";
      document.getElementById("jsButton").style.height = "101.25%";
    }
  }
}

//leaving logic and closing logic if owner
function leave() {
  if (owner) {
    let confirm = prompt("Confirm close (y or n)?");
    if (confirm) {
      var password = sessionStorage.getItem("password");
      var code = sessionStorage.getItem("code");
      sessionStorage.removeItem("code");
      sessionStorage.removeItem("language");
      sessionStorage.removeItem("roomPassword");

      socket.emit("close", { code, password });

      fetch("/deleteRoom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            alert(data.error);
          } else {
            window.location.href = "index.html";
          }
        })
        .catch((error) => {
          console.error("Error:", error.message);
        });
    }
  } else {
    let confirm = prompt("Confirm leave (y or n)?");
    if (confirm) {
      window.location.href = "index.html";
    }
  }
}

//sending data from users textarea or areas
function sendData() {
  var data;
  if (sessionStorage.getItem("language") == "html/css/js") {
    data = [
      document.getElementById("codeSpace").value,
      document.getElementById("codeSpaceCSS").value,
      document.getElementById("codeSpaceJS").value,
    ];
  } else {
    data = document.getElementById("codeSpace").value;
  }

  localCursorPos = document.getElementById("codeSpace").selectionStart;
  socket.emit("sendRoomData", { code, data });
}

function sendChat() {
  var code = sessionStorage.getItem("code");
  var name = `${sessionStorage.getItem("firstName")} ${sessionStorage.getItem(
    "lastName"
  )}`;
  var message = document.getElementById("chatInput").value;

  if (message != "") {
    socket.emit("sendChat", { code, name, message });
    document.getElementById("chatInput").value = "";
  } else {
    alert("Error: Empty chat message");
  }
}

//updating the line numbers on side of text areas
function updateLines(spaceName, lineName) {
  let lines = document.getElementById(spaceName).value.split("\n").length;
  document.getElementById(lineName).innerHTML = "";

  for (let i = 0; i < lines; i++) {
    var newLineNum = document.createElement("p");
    newLineNum.innerText = i + 1;
    newLineNum.style.textAlign = "end";
    newLineNum.style.height = "15px";
    newLineNum.style.width = "100%";
    newLineNum.style.color = "white";
    newLineNum.style.fontSize = "15px";

    if (i == 0) {
      newLineNum.style.paddingTop = "4px";
    }

    document.getElementById(lineName).appendChild(newLineNum);
  }
}

//updating the scroll of line numbers to match scroll of teaxt area
function updateScroll() {
  document.getElementById("lineNumbers").scrollTop =
    document.getElementById("codeSpace").scrollTop;

  document.getElementById("lineNumbersCSS").scrollTop =
    document.getElementById("codeSpaceCSS").scrollTop;

  document.getElementById("lineNumbersJS").scrollTop =
    document.getElementById("codeSpaceJS").scrollTop;
}

function scrollToChatBottom() {
  document.getElementById("chats").scrollTop =
    document.getElementById("chats").scrollHeight;
}

//sending code to server to run
function run() {
  if (sessionStorage.getItem("language") == "html/css/js") {
    const html = document.getElementById("codeSpace").value;
    const css = document.getElementById("codeSpaceCSS").value;
    const js = document.getElementById("codeSpaceJS").value;

    document.getElementById("outputFrame").contentDocument.body.innerHTML =
      html + "<style>" + css + "</style>";
    document.getElementById("outputFrame").contentWindow.eval(js);
  } else if (sessionStorage.getItem("language") == "Javascript") {
    const js = document.getElementById("codeSpace").value;

    try {
      const result = eval(js);
      document.getElementById("output").value =
        result !== undefined ? result : "Code exicuted without output";
    } catch (error) {
      document.getElementById("output").value = `Error: ${error.message}`;
    }
  } else {
    const language = sessionStorage.getItem("language");
    const userData = document.getElementById("codeSpace").value;
    const firstName = sessionStorage.getItem("firstName");
    const lastName = sessionStorage.getItem("lastName");

    socket.emit("run", { language, userData, firstName, lastName });
  }
}
