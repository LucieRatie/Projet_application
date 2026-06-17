const net = require("net");
const client = net.createConnection({ port: 27017, host: "127.0.0.1" }, () => {
  console.log("Connected to MongoDB!");
  process.exit(0);
});
client.on("error", (err) => {
  console.error("Connection failed:", err.message);
  process.exit(1);
});
