const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {}; // socket.id -> {name, team}
let roles = {};   // socket.id -> role

io.on("connection", (socket) => {
  console.log("user connected", socket.id);

  socket.on("join", ({ name, team }) => {
    players[socket.id] = { name, team };
    io.emit("updatePlayers", players);
  });

  socket.on("startGame", () => {
    roles = {};

    const teams = { red: [], black: [] };

    for (let id in players) {
      teams[players[id].team].push(id);
    }

    function assignTeam(teamList) {
      if (teamList.length <= 1) {
        teamList.forEach(id => roles[id] = "normal");
        return;
      }

      let spyCount = teamList.length >= 3
        ? (Math.random() < 0.5 ? 1 : 2)
        : 1;

      const shuffled = [...teamList].sort(() => 0.5 - Math.random());
      const spies = shuffled.slice(0, spyCount);

      teamList.forEach(id => {
        roles[id] = spies.includes(id) ? "spy" : "normal";
      });
    }

    assignTeam(teams.red);
    assignTeam(teams.black);

    for (let id in players) {
      if (roles[id] === "spy") {
        const teammates = Object.entries(players)
          .filter(([otherId, p]) =>
            p.team === players[id].team &&
            roles[otherId] === "spy"
          )
          .map(([_, p]) => p.name);

        io.to(id).emit("role", {
          role: "spy",
          teammates
        });
      } else {
        io.to(id).emit("role", { role: "normal" });
      }
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    delete roles[socket.id];
    io.emit("updatePlayers", players);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running"));
