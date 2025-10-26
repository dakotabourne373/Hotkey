const WebSocket = require("ws");
const { exec } = require("child_process");
const { networkInterfaces } = require("os");
const { Buffer } = require("node:buffer");

// grabbing local ip
const interfaces = networkInterfaces();
let localIp = "localhost";

for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses.
    if (iface.family === "IPv4" && !iface.internal) {
      localIp = iface.address;
    }
  }
}

const wss = new WebSocket.Server({ port: 8686 });

// list of valid keys
// const keymapper = {
//   F13: 13,
//   F14: 14,
//   F15: 15,
//   F16: 16,
//   F17: 17,
//   F18: 18,
//   F19: 19,
//   F20: 20,
//   F21: 21,
//   F22: 22,
//   F23: 23,
//   F24: 24,
// };

// const mapKeys = (arr) => arr.map((key) => keymapper[key]);

// create websocket
wss.on("connection", (ws) => {
  console.log("New client connected");

  // Sending a message to the client
  ws.send("Welcome to the WebSocket server!");

  // Listening for messages from the client
  ws.on("message", async (message) => {
    console.log(
      `Received message: ${JSON.stringify(message.toString(), null, 2)}`,
    );
    const json = message && JSON.parse(message);
    const combo = json.keyCombo; // e.g., "F13+F14"

    // PowerShell script for direct Windows API key injection
    const powershellScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
  [DllImport("user32.dll")]
  public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
  public const int KEYEVENTF_KEYDOWN = 0x0000;
  public const int KEYEVENTF_KEYUP = 0x0002;
}
"@
$keyMap = @{
  'F13' = 0x7C; 'F14' = 0x7D; 'F15' = 0x7E; 'F16' = 0x7F;
  'F17' = 0x80; 'F18' = 0x81; 'F19' = 0x82; 'F20' = 0x83;
  'F21' = 0x84; 'F22' = 0x85; 'F23' = 0x86; 'F24' = 0x87
}
$keys = '${combo}'.Split('+')
foreach ($key in $keys) {
  $vk = $keyMap[$key]
  [WinAPI]::keybd_event($vk, 0, [WinAPI]::KEYEVENTF_KEYDOWN, [UIntPtr]::Zero)
}
Start-Sleep -Milliseconds 50
[array]::Reverse($keys)
foreach ($key in $keys) {
  $vk = $keyMap[$key]
  [WinAPI]::keybd_event($vk, 0, [WinAPI]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
}
`;

    // Encode as Base64 to avoid escaping issues
    const encodedScript = Buffer.from(powershellScript, "utf16le").toString(
      "base64",
    );

    exec(
      `powershell -EncodedCommand ${encodedScript}`,
      (error, stdout, stderr) => {
        if (error) {
          console.error("Key press failed:", error);
          ws.send(`Error: ${error.message}`);
          return;
        }
        console.log("Key combo sent:", combo);
        ws.send(`Server received: ${message}`);
      },
    );
  });

  // Handling client disconnection
  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// tell user what local ip the computer is on to be used in the app.
console.log(`WebSocket server is running on ws://${localIp}:8686`);
