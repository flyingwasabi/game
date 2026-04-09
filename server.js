const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const ADMIN_PASSWORD = "bmsclub";

let roomCode = null;
let admins = new Set(); // socket.id
let players = {};       // socket.id -> {name, team}
let roles = {};         // socket.id -> "normal" | "spy"

io.on("connection", (socket) => {
  console.log("user connected", socket.id);

  socket.on("adminJoin", ({ password, roomCode: code }) => {
    if (password !== ADMIN_PASSWORD) {
      socket.emit("adminAuth", { ok: false, msg: "密码错误" });
      return;
    }
    const trimmed = (code || "").trim();
    if (!trimmed) {
      socket.emit("adminAuth", { ok: false, msg: "房间码必填" });
      return;
    }

    roomCode = trimmed;
    admins.add(socket.id);

    socket.emit("adminAuth", { ok: true, roomCode });

    // 刚登入主控，先同步一次玩家列表
    socket.emit("updatePlayers", players);
  });

  socket.on("join", ({ name, team, roomCode: code }) => {
    const trimmedCode = (code || "").trim();
    const trimmedName = (name || "").trim();

    if (!roomCode) {
      socket.emit("joinError", { msg: "房间未创建（请主控先登录并设置房间码）" });
      return;
    }
    if (trimmedCode !== roomCode) {
      socket.emit("joinError", { msg: "房间码不正确" });
      return;
    }
    if (!trimmedName) {
      socket.emit("joinError", { msg: "名字不能为空" });
      return;
    }

    players[socket.id] = { name: trimmedName, team };
    socket.emit("joined", { team });
    io.emit("updatePlayers", players);
  });

  socket.on("startGame", () => {
    if (!admins.has(socket.id)) return;

    roles = {};
    const teams = { red: [], black: [] };
    const startedAt = Date.now();

    for (let id in players) {
      teams[players[id].team].push(id);
    }

    function assignTeam(teamList) {
      if (teamList.length <= 1) {
        teamList.forEach(id => roles[id] = "normal");
        return [];
      }

      let spyCount = teamList.length >= 3
        ? (Math.random() < 0.5 ? 1 : 2)
        : 1;

      const shuffled = [...teamList].sort(() => 0.5 - Math.random());
      const spies = shuffled.slice(0, spyCount);

      teamList.forEach(id => {
        roles[id] = spies.includes(id) ? "spy" : "normal";
      });

      return spies;
    }

    const spiesByTeam = {
      red: assignTeam(teams.red),
      black: assignTeam(teams.black)
    };

    for (let id in players) {
      const team = players[id].team;
      const enemyTeam = team === "red" ? "black" : "red";

      const ownSpyNames = spiesByTeam[team].map(spyId => players[spyId]?.name).filter(Boolean);
      const enemySpyNames = spiesByTeam[enemyTeam].map(spyId => players[spyId]?.name).filter(Boolean);

      if (roles[id] === "spy") {
        io.to(id).emit("role", {
          role: "spy",
          startedAt,
          ownSpies: ownSpyNames,
          enemySpies: enemySpyNames,
        });
      } else {
        io.to(id).emit("role", { role: "normal", startedAt });
      }
    }

    io.emit("updatePlayers", players);
  });

  socket.on("kickPlayer", (playerId) => {
    if (!admins.has(socket.id)) return;

    const target = io.sockets.sockets.get(playerId);
    if (target) {
      target.emit("kicked");
      target.disconnect(true);
    }
  });

  socket.on("disconnect", () => {
    admins.delete(socket.id);
    delete players[socket.id];
    delete roles[socket.id];
    io.emit("updatePlayers", players);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running"));
