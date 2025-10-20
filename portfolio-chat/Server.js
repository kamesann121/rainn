const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const activeUsers = new Map(); // 名前 → socket.id
const userIcons = new Map();   // 名前 → アイコンID
const bannedUsers = new Set();

function getRandomIcon() {
  const icons = ["🐱", "🐶", "🐧", "🐸", "🦊", "🐼", "🐰", "🐟"];
  return icons[Math.floor(Math.random() * icons.length)];
}

io.on('connection', (socket) => {
  let nickname = "";

  socket.on("set nickname", (name) => {
    if (activeUsers.has(name) || bannedUsers.has(name)) {
      socket.emit("nickname rejected");
    } else {
      nickname = name;
      activeUsers.set(nickname, socket.id);
      userIcons.set(nickname, getRandomIcon());
      socket.emit("nickname accepted", userIcons.get(nickname));
    }
  });

  socket.on("chat message", ({ nickname, message }) => {
    if (bannedUsers.has(nickname)) {
      socket.emit("banned");
      return;
    }

    if (nickname === "admin" && message.startsWith("/ban ")) {
      const target = message.split(" ")[1];
      bannedUsers.add(target);
      io.emit("chat message", {
        nickname: "system",
        icon: "🚫",
        message: `${target} はBANされました。`
      });
      return;
    }

    io.emit("chat message", {
      nickname,
      icon: userIcons.get(nickname),
      message
    });
  });

  socket.on("disconnect", () => {
    activeUsers.delete(nickname);
    userIcons.delete(nickname);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`サーバー起動中！ポート: ${PORT}`);
});
