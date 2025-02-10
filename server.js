//declaring dependencies
const express = require("express");
const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");
const https = require("https");
const { Server } = require("socket.io");
const { networkInterfaces } = require("os");
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const { spawn } = require("child_process");
// const http = require("http");
// const mysql = require("mysql2");
require("dotenv").config({ path: "serverAssets/.env" });

//creating temp folder to store running files
if (!fs.existsSync("./temp")) {
  fs.mkdirSync("./temp");
}

//Grabbing key and pem from .env to run server on https
fs.writeFileSync("temp/tempCert.pem", process.env.HTTPS_CERT, function (err) {
  if (err) {
    return console.log(err);
  }
});

fs.writeFileSync("temp/tempKey.pem", process.env.HTTPS_KEY, function (err) {
  if (err) {
    return console.log(err);
  }
});

const options = {
  key: fs.readFileSync("temp/tempKey.pem"),
  cert: fs.readFileSync("temp/tempCert.pem"),
};

fs.unlinkSync("temp/tempKey.pem");
fs.unlinkSync("temp/tempCert.pem");

//initating react, starting http server, starting socket server
const app = express();
const server = https.createServer(options, app);
const io = new Server(server);
const port = 3000;
const nets = networkInterfaces();

//telling express what files to use
app.use(express.json());
app.use(express.static("public"));

// declaring data storage that will earase on server close
var rooms = {};
var codes = [];
var authCodes = {};

//getting current ipv4 to run - TAKEN FROM STACK OVERFLOW
const ipResults = Object.create(null);
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
    // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
    const familyV4Value = typeof net.family === "string" ? "IPv4" : 4;
    // spawn("node", [`serverAssets/logs/extra/test.js`]);
    if (net.family === familyV4Value && !net.internal) {
      if (!ipResults[name]) {
        ipResults[name] = [];
      }
      ipResults[name].push(net.address);
    }
  }
}

const ip = ipResults["en0"];

//return hashed value
function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

//create random 6 didget code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000);
}

function getDate() {
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, "0");
  var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
  var yyyy = today.getFullYear();

  return `${mm}-${dd}-${yyyy}`;
}

function saveLog(data) {
  const date = new Date();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  fs.appendFileSync(
    `serverAssets/logs/${getDate()}.txt`,
    `${hours}:${minutes}:${seconds}: ${data}\n`
  );
}

//send email for 2fa
function sendEmail(firstName, email) {
  //telling nodemailer what mail service to use
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  //generateing 2fa code to send to user
  var code = generateCode();
  if (rooms[code] || authCodes[code]) {
    code = generateCode();
  }

  //creating countdown for code till expire
  authCodes[code] = { time: 60, email: email };

  //-------------------
  //loading email template and adding variables like code and name
  const source = fs
    .readFileSync("serverAssets/emailTemplate.html", "utf-8")
    .toString();

  const template = handlebars.compile(source);
  const replacements = {
    authCode: code,
    firstName: firstName,
  };
  const htmlToSend = template(replacements);
  //-------------------

  //telling nodemailer who to email from, who to email to and what to email
  var mailOptions = {
    from: "cory.pearl99@gmail.com",
    to: email,
    subject: "CodeSync Verification",
    html: htmlToSend,
    attachments: [
      {
        filename: "logo.png",
        path: "serverAssets/logo.png",
        cid: "logo",
      },
    ],
  };

  //sending email and logging result
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      saveLog(error);
    } else {
      saveLog("Email sent: " + info.response);
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
    if (rooms[code]) {
      const room = rooms[code];
      if (!room.users.includes(room.owner)) {
        delete rooms[code];
        codes.splice(codes.indexOf(code));
        room.socketIDs.forEach((socketId) => {
          io.to(socketId).emit("ownerClosed");
        });
        saveLog(`Room deleted with code because owner closed tab: ${code}`);
      }
    }
  }
}, 1000);

//send 2fa email
app.post("/send2fa", (req, res) => {
  var { firstName, email } = req.body;
  sendEmail(firstName, email);
  return res.status(200).json({ success: true });
});

//check 2fa validation
app.post("/check2fa", (req, res) => {
  var { authCode, email } = req.body;

  if (authCodes[authCode] && authCodes[authCode].email == email) {
    delete authCodes[authCode];
    return res.status(200).json({ success: true });
  } else {
    return res.status(200).json({ success: false });
  }
});

//create codeSync
app.post("/createCodeSync", (req, res) => {
  var { password, language, owner, ownerPassword } = req.body;
  ownerPassword = sha256(ownerPassword);

  //generateing 6 didget room code
  var code = generateCode();
  if (rooms[code]) {
    code = generateCode();
  }
  codes.push(code);

  //creating room based on lnaguage, html/css/js needs more data space
  if (language == "html/css/js") {
    var newRoom = {
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
    var newRoom = {
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

  //adding starter code to room depending on the language
  if (newRoom.language == "Python") {
    newRoom.data = `print("Hello World")`;
  } else if (newRoom.language == "Java") {
    newRoom.data = `class HelloWorld\n{\n\tpublic static void main(String []args)\n\t{\n\t\tSystem.out.println("Hello World!");\n\t}\n};`;
  } else if (newRoom.language == "Javascript") {
    newRoom.data = `console.log("Hello World")`;
  } else if (newRoom.language == "html/css/js") {
    newRoom.data.html = `<!DOCTYPE html>\n<html lang="en">\n\t<head>\n\t\t<meta charset="UTF-8" />\n\t\t<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n\t\t<title>Hello World</title>\n\t</head>\n\t<body>\n\t\t<h1>Hello World!</h1>\n\t</body>\n</html>`;
  }

  //adding room to storage
  rooms[code] = newRoom;

  saveLog(`Room created under code: ${code} using the language ${language}`);

  return res.send({ code: code });
});

//delete codeSync
app.post("/deleteRoom", (req, res) => {
  var { code, password } = req.body;
  password = sha256(password);

  if (rooms[code]) {
    //making sure its owner whos deleteing room then dleteing all data about the room
    if (rooms[code].ownerPassword == password) {
      delete rooms[code];
      delete codes.indexOf(code);
      saveLog(`Room deleted with code: ${code}`);
      return res.status(200).json({ success: true });
    }
  }
});

//join codesync
app.post("/joinCodeSync", (req, res) => {
  var { code, password, firstName, lastName } = req.body;

  //making sure room exists first
  if (rooms[code]) {
    //checking if room password is valid
    if (rooms[code].password == password) {
      //adding user to room and sending back language
      rooms[code].users.push(`${firstName} ${lastName}`);
      saveLog(`User connected to room: ${code}`);
      return res.send({
        language: rooms[code].language,
        address: ip,
      });
    } else {
      return res.json({ error: "Server error" });
    }
  } else {
    return res.json({ error: "Server error" });
  }
});

//join by share link
app.get("/joinCodeSyncByLink", (req, res) => {
  var { code, password } = req.query;

  //page to give to make sure they are either logged in or input a name, then redirects to codesync
  const html = `
  <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Redirecting...</title>
  </head>
  <body></body>
  <script>
    window.onload = () => {
      if (
        sessionStorage.getItem("firstName") != null
      ) {
        sessionStorage.setItem("code", ${code});
        sessionStorage.setItem("roomPassword", "${password}");
        window.location.href = "codeSync.html";
      } else {
        var firstName = prompt("Enter first name:");
        var lastName = prompt("Enter last name:");
        if (firstName && lastName) {
          sessionStorage.setItem("firstName", firstName);
          sessionStorage.setItem("lastName", lastName);
            sessionStorage.setItem("code", ${code});
          sessionStorage.setItem("roomPassword", "${password}");
          window.location.href = "codeSync.html";
        } else {
          window.location.href = "index.html";
        }
      }
    };
  </script>
</html>
  `;

  res.send(html);
});

//OLD ACCOUNT CODE WITH JSON, KEEPING JUST IN CASE
//------------------------------------------------------------------------------------------------------------------------------
//check 2fa code for users.json
app.post("/check2fa", (req, res) => {
  var { authCode, email } = req.body;

  fs.readFile("serverAssets/users.json", "utf8", (err, data) => {
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
  saveLog("New user\n" + newUser);

  const full = {
    email,
    newUser,
  };

  fs.readFile("serverAssets/users.json", "utf8", (err, data) => {
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
        fs.writeFile(
          "serverAssets/users.json",
          JSON.stringify(users, null, 2),
          (err) => {
            if (err) {
              return res.status(500).json({ error: "Failed to save user" });
            } else {
              saveLog("New user created succsefully");
              return res.status(200).json({ success: true });
            }
          }
        );
      }
    }
  });
});

//send account info
app.get("/getInfo", (req, res) => {
  var { email, password } = req.query;
  password = sha256(password);

  fs.readFile("serverAssets/users.json", "utf8", (err, data) => {
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
      const firstName = user.newUser.firstName;
      const lastName = user.newUser.lastName;

      saveLog("Account info sent");
      return res.send({ first: firstName, last: lastName });
    }
  });
});

//sign in
app.post("/signIn", (req, res) => {
  var { email, password } = req.body;
  password = sha256(password);

  fs.readFile("serverAssets/users.json", "utf8", (err, data) => {
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

    saveLog("User sign in succses");
    return res.status(200).json({ success: true });
  });
});

//change info
app.post("/changeInfo", (req, res) => {
  var { email, password, firstName, lastName, newEmail, newPassword } =
    req.body;
  password = sha256(password);
  newPassword = sha256(newPassword);

  fs.readFile("serverAssets/users.json", "utf8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      return res.status(500).json({ error: "Server error" });
    }

    let users = [];
    if (data) {
      users = JSON.parse(data);
    }

    const user = users.find((user) => user.email === email);

    if ((password = user.newUser.password)) {
      user.email = newEmail;
      user.newUser.firstName = firstName;
      user.newUser.lastName = lastName;
      user.newUser.email = newEmail;
      user.newUser.password = newPassword;

      fs.writeFile(
        "serverAssets/users.json",
        JSON.stringify(users, null, 2),
        (err) => {
          if (err) {
            return res.status(500).json({ error: "Failed to save user" });
          }
        }
      );
    }
  });

  saveLog("User info changed succsesfully");
  return res.status(200).json({ success: true });
});
//------------------------------------------------------------------------------------------------------------------------------
//Code for sql server
//account creation
// app.post("/createAccount", (req, res) => {
//   var { firstName, lastName, email, password } = req.body;
//   console.log(req.body);
//   password = sha256(password);

//   //sending sql query to add user info to database then sending back result
//   dbConnection.query(
//     `INSERT INTO users (email, firstName, lastName, password) VALUES ('${email}', '${firstName}', '${lastName}', '${password}')`,
//     function (err, result) {
//       if (err) throw err;
//       return res.status(200).json({ success: true });
//     }
//   );
// });

// //sign in
// app.post("/signIn", (req, res) => {
//   var { email, password } = req.body;
//   password = sha256(password);

//   //checking if account exists and checking if credentials are correct then sending back result
//   dbConnection.query(
//     `SELECT * FROM users WHERE email = '${email}'`,
//     function (err, result) {
//       if (err) throw err;

//       if (result.length > 0) {
//         if (result[0].password != password) {
//           return res.status(400).json({ error: "Incorrect password" });
//         }
//         return res.status(200).json({ success: true });
//       } else {
//         return res
//           .status(400)
//           .json({ error: "Account does not exist, please create an account" });
//       }
//     }
//   );
// });

// //change account info
// app.post("/changeInfo", (req, res) => {
//   var { email, password, firstName, lastName, new_email, new_password } =
//     req.body;
//   password = sha256(password);
//   new_password = sha256(new_password);

//   //making query to database to change any info the user wanted to change only if passowrds match
//   dbConnection.query(
//     `SELECT * FROM users WHERE email = '${email}'`,
//     function (err, result) {
//       if (err) throw err;

//       if (result.length > 0) {
//         if (result[0].password != password) {
//           return res.status(400).json({ error: "Incorrect password" });
//         }

//         var query = ``;

//         if (firstName != result[0].firstName) {
//           query += `update users set firstName = "${firstName}" where email = "${email}"`;
//         }

//         if (lastName != result[0].lastName) {
//           query += `update users set lastName = "${lastName}" where email = "${email}"`;
//         }

//         if (new_password != result[0].password) {
//           query += `update users set password = "${new_password}" where email = "${email}"`;
//         }

//         dbConnection.query(query);

//         if (new_email != result[0].email) {
//           dbConnection.query(
//             `update users set email = "${new_email}" where email = "${email}"`
//           );
//         }
//       } else {
//         return res
//           .status(400)
//           .json({ error: "Account does not exist, please create an account" });
//       }
//     }
//   );
// });

// //send account info
// app.get("/getInfo", (req, res) => {
//   var { email, password } = req.query;
//   password = sha256(password);

//   //sending account info to client to display name on screen and use for joining codesync
//   dbConnection.query(
//     `SELECT * FROM users WHERE email = '${email}'`,
//     function (err, result) {
//       if (err) throw err;

//       if (result.length > 0) {
//         if (result[0].password != password) {
//           return res.status(400).json({ error: "Incorrect password" });
//         }
//         const firstName = result[0].firstName;
//         const lastName = result[0].lastName;
//         console.log("Account info sent");
//         return res.send({ first: firstName, last: lastName });
//       } else {
//         return res
//           .status(400)
//           .json({ error: "Account does not exist, please create an account" });
//       }
//     }
//   );
// });

//socketIo for all the room client/server communication in the coding room
io.on("connection", (socket) => {
  //initiate connection
  socket.on("connectSocket", ({ code }) => {
    if (rooms[code]) {
      if (!rooms[code].socketIDs[socket.id]) {
        rooms[code].socketIDs.push(socket.id);
      }

      //sneding basic info to user on connection
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

  //send room data to client, keeps clients screens updated
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

  // Save room data (from a user), then send new data to everyone connected to room
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

  //recive chats form user and brodcast to rest of room
  socket.on("sendChat", ({ code, name, message }) => {
    if (rooms[code]) {
      rooms[code].socketIDs.forEach((socketId) => {
        io.to(socketId).emit("reciveChat", [name, message]);
      });
    }
  });

  //check if user is owner to see if they are allowed to close the room
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

  //close room for all users when owner closes
  socket.on("close", ({ code, password }) => {
    if (rooms[code]) {
      let room = rooms[code];
      if (room.ownerPassword == sha256(password)) {
        room.socketIDs.forEach((socketId) => {
          io.to(socketId).emit("ownerClosed");
        });
        saveLog(`Room ${code} closed`);
        // delete rooms[code];
        codes.splice(codes.indexOf(code));
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

  //run code based on language, html/css/js and js are ran client side
  socket.on("run", ({ language, userData, firstName, lastName }) => {
    //they are creating proceses to run the java or python code which run files created in the temp folder, then relaying the output to the client, then deleting the file from the temp folder
    if (language == "Python") {
      if (fs.existsSync(`temp/${firstName}${lastName}.py`)) {
        saveLog("File already Running");
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
          let toSend = data.toString();
          const split = toSend.split("/Users/1002562/Desktop/codeSync/temp/");
          io.to(socket.id).emit("ranData", split);
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
        saveLog("File already Running");
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

  //handle disconect, update other uses and server that user has left the room
  socket.on("disconnect", () => {
    for (const code in rooms) {
      const index = rooms[code].socketIDs.indexOf(socket.id);
      if (index !== -1) {
        rooms[code].socketIDs.splice(index, 1);
        rooms[code].users.splice(index, 1);
        rooms[code].socketIDs.forEach((socketId) => {
          io.to(socketId).emit("updateUsers", [rooms[code].users]);
        });
        saveLog(`User disconected from room ${code}`);
        break;
      }
    }
  });
});

//server side commands to interact with server and database
process.stdin.on("data", (data) => {
  const command = data.toString().trim();
  if (command == "help") {
    //display all commands
    console.log(
      "Commands:\n- stop\n- close-{code}\n- display-{code}\n- codes\n- q$(query)"
    );
  } else if (command == "stop") {
    //stop server
    console.log("Stopping the process...");
    process.exit(0);
  } else if (command.split("-")[0] == "close") {
    //close any given room
    const code = Number(command.split("-")[1]);
    if (rooms[code]) {
      const room = rooms[code];
      delete rooms[code];
      codes.splice(codes.indexOf(code));
      room.socketIDs.forEach((socketId) => {
        io.to(socketId).emit("serverClosed");
      });
      console.log(`Room deleted with code: ${code}`);
    } else {
      console.log("Room does not exist");
    }
  } else if (command.split("-")[0] == "display") {
    //display info about any given room
    const code = Number(command.split("-")[1]);
    if (rooms[code]) {
      console.log(rooms[code]);
    } else {
      console.log("Room does not exist");
    }
  } else if (command == "codes") {
    //display all active room codes
    for (let i = 0; i < codes.length; i++) {
      console.log(`- ${codes[i]}`);
    }
  } else if (command.split("$")[0] == "q") {
    //send sql querys
    dbConnection.query(command.split("$")[1], function (err, result) {
      if (err) throw err;

      console.log(result);
    });
  } else {
    console.log("Command not recognized:", command);
    console.log("Try: help");
  }
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);

  saveLog(`Uncaught Exception: ${err}`);
});

//Create connection to database
// const dbConnection = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   port: process.env.DB_PORT,
// });

//Check if database connection is secure then start server
// dbConnection.connect((err) => {
//   if (err) {
//     console.log("DB could't connect, stopping server to avoid issues.");
//     // process.exit(0);
//   } else {
//     console.log("DB connected");
//   }
// });

server.listen(port, ip.toString(), () => {
  console.log(`Server is running on https://${ip.toString()}:${port}`);
  console.log("Type 'help' for a list of commands");
  console.log("Check logs folder in server assets for updated logs");
});
