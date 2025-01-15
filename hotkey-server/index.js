const WebSocket = require("ws");
const { keyboard } = require("@nut-tree-fork/nut-js");
const { networkInterfaces } = require("os");

// grabbing local ip
const interfaces = networkInterfaces();
let localIp = "localhost";

for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
    if (iface.family === "IPv4" && !iface.internal) {
      localIp = iface.address;
    }
  }
}

const wss = new WebSocket.Server({ port: 8686 });

// list of valid keys
const keymapper = {
  F13: 13,
  F14: 14,
  F15: 15,
  F16: 16,
  F17: 17,
  F18: 18,
  F19: 19,
  F20: 20,
  F21: 21,
  F22: 22,
  F23: 23,
  F24: 24,
};

const mapKeys = (arr) => arr.map((key) => keymapper[key]);

// create websocket
wss.on("connection", (ws) => {
  console.log("New client connected");

  // Sending a message to the client
  ws.send("Welcome to the WebSocket server!");

  // Listening for messages from the client.
  ws.on("message", async (message) => {
    console.log(
      `Received message: ${JSON.stringify(message.toString(), null, 2)}`,
    );
    const json = message && JSON.parse(message);
    const combo = mapKeys(json.keyCombo.split("+"));
    combo.forEach(async (key) => await keyboard.pressKey(key));

    if (json.isSync) {
      combo.reverse().forEach(async (key) => await keyboard.releaseKey(key));
    } else await keyboard.releaseKey(combo[combo.length - 1]);

    // Echoing the message back to the client
    ws.send(`Server received: ${message}`);
  });

  // Handling client disconnection
  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// tell user what local ip the computer is on to be used in the app.
console.log(`WebSocket server is running on ws://${localIp}:8686`);
