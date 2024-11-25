//declaring dependencies
const express = require("express");
const fs = require("fs");
const { createHash } = require("crypto");
const http = require("http");
const https = require("https");
const { Server } = require("socket.io");
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const { spawn } = require("child_process");

const protocal = "https";
//const protocal = "http";
const port = 8443;
const ip = "10.34.7.111";
//const ip = "192.168.86.165";
//const ip = "192.168.86.168"

//key and cert for https
const options = {
  key: fs.readFileSync("keys/key.pem"),
  cert: fs.readFileSync("keys/cert.pem"),
};

//app creation, https server creation, and io creation in the server
const app = express();
const server = https.createServer(options, app);
//const server = http.createServer(app);
const io = new Server(server);

var rooms = {};
var codes = [];
var authCodes = {};

//telling express what files to use
app.use(express.json());
app.use(express.static("public"));

//creating temp folder to store running files
if (!fs.existsSync("temp")) {
  fs.mkdirSync("temp");
}

//return hashed value
function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

//create random 6 didget code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000);
}

//email for 2fa
function sendEmail(firstName, email) {
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "cory.pearl99@gmail.com",
      pass: "zsth skbg zvma fwhe",
    },
  });

  var code = generateCode();
  if (rooms[code] || authCodes[code]) {
    code = generateCode();
  }

  authCodes[code] = { time: 60, email: email };

  const source = fs
    .readFileSync("serverAssets/emailtemplate.html", "utf-8")
    .toString();

  const template = handlebars.compile(source);
  const replacements = {
    authCode: code,
    firstName: firstName,
  };
  const htmlToSend = template(replacements);

  var mailOptions = {
    from: "cory.pearl99@gmail.com",
    to: email,
    subject: "CodeSync Varifacation",
    html: htmlToSend,
    attachments: [
      {
        filename: "logo.png",
        path: "serverAssets/logo.png",
        cid: "logo",
      },
    ],
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

//update authCode exparation
var timer = setInterval(function () {
  for (let key in authCodes) {
    if (authCodes[key].time != 0) {
      authCodes[key].time -= 1;
    } else {
      delete authCodes[key];
    }
  }
}, 1000);

//check if any rooms dont have their owner connected
var checkOwnerConnected = setInterval(function () {
  for (const code of codes) {
    const room = rooms[code];
    if (!room.users.includes(room.owner)) {
      delete rooms[code];
      codes.splice(codes.indexOf(code));
      room.socketIDs.forEach((socketId) => {
        io.to(socketId).emit("ownerClosed");
      });
      console.log(`Room deleted with code because owner closed tab: ${code}`);
    }
  }
}, 1000);

//send 2fa email
app.post("/send2fa", (req, res) => {
  var { firstName, email } = req.body;
  sendEmail(firstName, email);
  return res.status(200).json({ success: true });
});

//check 2fa code
app.post("/check2fa", (req, res) => {
  var { authCode, email } = req.body;

  fs.readFile("users.json", "utf8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      return res.status(500).json({ error: "Server error" });
    } else {
      let users = [];
      if (data) {
        users = JSON.parse(data);
      }

      //check if email already exists
      const existingUser = users.find((user) => user.email === email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already exists" });
      } else {
        if (authCodes[authCode] && authCodes[authCode].email == email) {
          delete authCodes[authCode];
          return res.status(200).json({ success: true });
        } else {
          return res.status(200).json({ success: false });
        }
      }
    }
  });
});

//create codeSync
app.post("/createCodeSync", (req, res) => {
  var { password, language, owner, ownerPassword } = req.body;
  ownerPassword = sha256(ownerPassword);

  var code = generateCode();
  if (rooms[code]) {
    code = generateCode();
  }
  codes.push(code);

  if (language == "html/css/js") {
    var new_room = {
      owner: owner,
      ownerPassword: ownerPassword,
      code: code,
      password: password,
      language: language,
      users: [],
      data: {
        html: "",
        css: "",
        js: "",
      },
      socketIDs: [],
    };
  } else {
    var new_room = {
      owner: owner,
      ownerPassword: ownerPassword,
      code: code,
      password: password,
      language: language,
      users: [],
      data: "",
      socketIDs: [],
    };
  }

  if (new_room.language == "Python") {
    new_room.data = `print("Hello World")`;
  } else if (new_room.language == "Java") {
    new_room.data = `class HelloWorld\n{\n\tpublic static void main(String []args)\n\t{\n\t\tSystem.out.println("Hello World!");\n\t}\n};`;
  } else if (new_room.language == "Javascript") {
    new_room.data = `console.log("Hello World")`;
  } else if (new_room.language == "html/css/js") {
    new_room.data.html = `<!DOCTYPE html>\n<html lang="en">\n\t<head>\n\t\t<meta charset="UTF-8" />\n\t\t<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n\t\t<title>Hello World</title>\n\t</head>\n\t<body>\n\t\t<h1>Hello World!</h1>\n\t</body>\n</html>`;
  }
  rooms[code] = new_room;

  console.log(
    `Room created under code: ${code} using the language ${language}`
  );

  console.log(new_room);

  return res.send({ code: code });
});

//delete codeSync
app.post("/deleteRoom", (req, res) => {
  var { code, password } = req.body;
  password = sha256(password);

  if (rooms[code]) {
    if (rooms[code].ownerPassword == password) {
      delete rooms[code];
      delete codes.indexOf(code);
      console.log(`Room deleted with code: ${code}`);
      return res.status(200).json({ success: true });
    }
  }
});

//join codesync
app.post("/joinCodeSync", (req, res) => {
  var { code, password, firstName, lastName } = req.body;

  var roomFound = false;
  if (rooms[code]) {
    if (rooms[code].password == password) {
      roomFound = true;
      rooms[code].users.push(`${firstName} ${lastName}`);
      console.log(`User connected to room: ${code}`);
      return res.send({ language: rooms[code].language });
    } else {
      return res.json({ error: "Server error" });
    }
  }

  if (!roomFound) {
    return res.json({ error: "Server error" });
  }
});

//create account
app.post("/createAccount", (req, res) => {
  var { firstName, lastName, email, password } = req.body;

  password = sha256(password);

  const newUser = {
    firstName,
    lastName,
    email,
    password,
  };

  console.log(newUser);

  const full = {
    email,
    newUser,
  };

  fs.readFile("users.json", "utf8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      return res.status(500).json({ error: "Server error" });
    } else {
      let users = [];
      if (data) {
        users = JSON.parse(data);
      }

      //check if email already exists
      const existingUser = users.find((user) => user.email === email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already exists" });
      } else {
        users.push(full);

        //save updated users list to json
        fs.writeFile("users.json", JSON.stringify(users, null, 2), (err) => {
          if (err) {
            return res.status(500).json({ error: "Failed to save user" });
          } else {
            console.log("New user created succsefully");
            return res.status(200).json({ success: true });
          }
        });
      }
    }
  });
});

//sign in
app.post("/signIn", (req, res) => {
  var { email, password } = req.body;
  password = sha256(password);

  fs.readFile("users.json", "utf8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      return res.status(500).json({ error: "Server error" });
    }

    let users = [];
    if (data) {
      users = JSON.parse(data);
    }

    const user = users.find((user) => user.email === email);

    if (!user) {
      return res
        .status(400)
        .json({ error: "Account does not exist, please create an account" });
    }

    if (user.newUser.password !== password) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    console.log("User sign in succses");
    return res.status(200).json({ success: true });
  });
});

//change info
app.post("/changeInfo", (req, res) => {
  var { email, password, firstName, lastName, new_email, new_password } =
    req.body;
  password = sha256(password);
  new_password = sha256(new_password);

  fs.readFile("users.json", "utf8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      return res.status(500).json({ error: "Server error" });
    }

    let users = [];
    if (data) {
      users = JSON.parse(data);
    }

    const user = users.find((user) => user.email === email);

    if ((password = user.newUser.password)) {
      user.email = new_email;
      user.newUser.firstName = firstName;
      user.newUser.lastName = lastName;
      user.newUser.email = new_email;
      user.newUser.password = new_password;

      fs.writeFile("users.json", JSON.stringify(users, null, 2), (err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to save user" });
        }
      });
    }
  });

  console.log("User info changed succsesfully");
  return res.status(200).json({ success: true });
});

//send account info
app.get("/getInfo", (req, res) => {
  var { email, password } = req.query;
  password = sha256(password);

  fs.readFile("users.json", "utf8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      return res.status(500).json({ error: "Server error" });
    }

    let users = [];
    if (data) {
      users = JSON.parse(data);
    }

    const user = users.find((user) => user.email === email);

    if (!user) {
      return res
        .status(400)
        .json({ error: "Account does not exist, please create an account" });
    }

    if (user.newUser.password !== password) {
      return res.status(400).json({ error: "Incorrect password" });
    } else {
      const first_name = user.newUser.firstName;
      const last_name = user.newUser.lastName;

      console.log("Account info sent");
      return res.send({ first: first_name, last: last_name });
    }
  });
});

io.on("connection", (socket) => {
  //initiate connection
  socket.on("connectSocket", ({ code }) => {
    if (rooms[code]) {
      if (!rooms[code].socketIDs[socket.id]) {
        rooms[code].socketIDs.push(socket.id);
      }

      rooms[code].socketIDs.forEach((socketId) => {
        io.to(socketId).emit("updateUsers", [rooms[code].users]);
        if (rooms[code].language == "html/css/js") {
          io.to(socket.id).emit("roomData", [
            rooms[code].data.html,
            rooms[code].data.css,
            rooms[code].data.js,
            rooms[code].users,
          ]);
        } else {
          io.to(socket.id).emit("roomData", [
            rooms[code].data,
            rooms[code].users,
          ]);
        }
      });
    }
  });

  //send room data to client
  socket.on("getRoomData", ({ code }) => {
    if (rooms[code]) {
      if (rooms[code].language == "html/css/js") {
        io.to(socket.id).emit("roomData", [
          rooms[code].data.html,
          rooms[code].data.css,
          rooms[code].data.js,
          rooms[code].users,
        ]);
      } else {
        io.to(socket.id).emit("roomData", [
          rooms[code].data,
          rooms[code].users,
        ]);
      }
    }
  });

  // Save room data (from a user)
  socket.on("sendRoomData", ({ code, data }) => {
    if (rooms[code]) {
      if (rooms[code].language == "html/css/js") {
        rooms[code].data.html = data[0];
        rooms[code].data.css = data[1];
        rooms[code].data.js = data[2];
      } else {
        rooms[code].data = data;
      }

      rooms[code].socketIDs.forEach((socketId) => {
        if (rooms[code].language == "html/css/js") {
          io.to(socketId).emit("roomData", [
            rooms[code].data.html,
            rooms[code].data.css,
            rooms[code].data.js,
          ]);
        } else {
          io.to(socketId).emit("roomData", [rooms[code].data]);
        }
      });
    }
  });

  //send and recive chats
  socket.on("sendChat", ({ code, name, message }) => {
    if (rooms[code]) {
      rooms[code].socketIDs.forEach((socketId) => {
        io.to(socketId).emit("reciveChat", [name, message]);
      });
    }
  });

  //check if user is owner
  socket.on("checkOwner", ({ name, password, code }) => {
    if (rooms[code]) {
      let room = rooms[code];
      if (room.owner == name && sha256(password) == room.ownerPassword) {
        io.to(socket.id).emit("ownerChecked", true);
      } else {
        io.to(socket.id).emit("ownerChecked", false);
      }
    }
  });

  //close room for all users
  socket.on("close", ({ code, password }) => {
    if (rooms[code]) {
      let room = rooms[code];
      if (room.ownerPassword == sha256(password)) {
        room.socketIDs.forEach((socketId) => {
          io.to(socketId).emit("ownerClosed");
        });
        console.log(`Room ${code} closed`);
      }
    }
  });

  //For voice chat, writin by ChatGPT
  //---------------------------------------
  socket.on("offer", (offer, roomId) => {
    socket.to(roomId).emit("offer", offer);
  });

  socket.on("answer", (answer, roomId) => {
    socket.to(roomId).emit("answer", answer);
  });

  socket.on("candidate", (candidate, roomId) => {
    socket.to(roomId).emit("candidate", candidate);
  });

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
  });
  //---------------------------------------

  //run code
  socket.on("run", ({ language, userData, firstName, lastName }) => {
    if (language == "Python") {
      if (fs.existsSync(`temp/${firstName}${lastName}.py`)) {
        console.log("File already Running");
      } else {
        fs.writeFile(`temp/${firstName}${lastName}.py`, userData, (err) => {
          if (err) {
            console.error(err);
            return;
          }
        });

        const pythonProcess = spawn("python3", [
          `temp/${firstName}${lastName}.py`,
        ]);

        pythonProcess.stdout.on("data", (data) => {
          io.to(socket.id).emit("ranData", data.toString());
        });

        pythonProcess.stderr.on("data", (data) => {
          io.to(socket.id).emit("ranData", data.toString());
        });

        socket.on("userInput", (input) => {
          pythonProcess.stdin.write(input + "\n");
        });

        socket.on("stopProgram", () => {
          pythonProcess.kill();
        });

        pythonProcess.on("close", (code) => {
          io.to(socket.id).emit("codeCompleate");
          fs.unlink(`temp/${firstName}${lastName}.py`, (err) => {
            if (err) {
              console.error(err);
              return;
            }
          });
        });
      }
    } else if (language == "Java") {
      if (fs.existsSync(`temp/${firstName}${lastName}.java`)) {
        console.log("File already Running");
      } else {
        fs.writeFile(`temp/${firstName}${lastName}.java`, userData, (err) => {
          if (err) {
            console.error(err);
            return;
          }
        });

        const javaProcess = spawn("java", [
          `temp/${firstName}${lastName}.Java`,
        ]);

        javaProcess.stdout.on("data", (data) => {
          io.to(socket.id).emit("ranData", data.toString());
        });

        javaProcess.stderr.on("data", (data) => {
          io.to(socket.id).emit("ranData", data.toString());
        });

        socket.on("userInput", (input) => {
          javaProcess.stdin.write(input + "\n");
        });

        javaProcess.on("close", (code) => {
          io.to(socket.id).emit("codeCompleate");
          fs.unlink(`temp/${firstName}${lastName}.Java`, (err) => {
            if (err) {
              console.error(err);
              return;
            }
          });
        });
      }
    }
  });

  //handle disconect
  socket.on("disconnect", () => {
    for (const code in rooms) {
      const index = rooms[code].socketIDs.indexOf(socket.id);
      if (index !== -1) {
        rooms[code].socketIDs.splice(index, 1);
        rooms[code].users.splice(index, 1);
        rooms[code].socketIDs.forEach((socketId) => {
          io.to(socketId).emit("updateUsers", [rooms[code].users]);
        });
        console.log(`User disconected from room ${code}`);
        break;
      }
    }
  });
});

//server side commands
process.stdin.on("data", (data) => {
  const command = data.toString().trim();
  if (command == "help") {
    console.log("Commands:\nstop\nclose-{code}");
  } else if (command == "stop") {
    console.log("Stopping the process...");
    process.exit(0);
  } else if (command.split("-")[0] == "close") {
    const code = Number(command.split("-")[1]);
    if (rooms[code]) {
      const room = rooms[code];
      delete rooms[code];
      codes.splice(codes.indexOf(code));
      room.socketIDs.forEach((socketId) => {
        io.to(socketId).emit("ownerClosed");
      });
      console.log(`Room deleted with code: ${code}`);
    } else {
      console.log("Room does not exist");
    }
  } else {
    console.log("Command not recognized:", command);
    console.log("Try: help");
  }
});

server.listen(port, ip, () => {
  console.log(`Server is running on ${protocal}://${ip}:${port}`);
});