const { createServer } = require("http");

const next = require("next");

const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";

const app = next({ dev });

const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handler(req, res);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected", socket.id);

    socket.on("bus-location", (data) => {
      console.log("Bus location:", data);

      io.emit("bus-location-update", data);
    });
    socket.on(
  "student-status",

  (data) => {

    console.log(
      "Student Status:",
      data
    );

    io.emit(
      "student-status-update",
      data
    );
  }
);
    socket.on("disconnect", () => {
      console.log("Socket Disconnected:", socket.id);
    });
  });

  httpServer.listen(3000, () => {
    console.log("Server running on port 3000");
  });
});
