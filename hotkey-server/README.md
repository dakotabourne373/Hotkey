# Hotkey Server

Cross-platform WebSocket server for triggering keyboard shortcuts remotely from a mobile app.

## Supported Platforms

- **Windows**: Uses PowerShell with native Windows API (`keybd_event`)
- **Linux**: Uses `xdotool` for X11 key injection

## Requirements

### Windows
- No additional requirements - uses built-in PowerShell

### Linux
- `xdotool` must be installed:
  ```bash
  sudo apt-get install xdotool
  ```

## Installation

```bash
npm install
```

## Building

### Build for Windows
```bash
npm run build-windows
```
Output: `dist/server.exe`

### Build for Linux
```bash
npm run build-linux
```
Output: `dist/server-linux`

### Build for Both Platforms
```bash
npm run build-all
```

## Running

### Development
```bash
node index.js
```

### Production (after building)

**Windows:**
```bash
./dist/server.exe
```

**Linux:**
```bash
chmod +x ./dist/server-linux
./dist/server-linux
```

## Usage

1. Start the server - it will display the local IP address
2. In your mobile app, connect to `ws://<IP>:8686`
3. Send messages in this format:
   ```json
   {
     "keyCombo": "F13+F14",
     "isSync": false
   }
   ```

## Supported Keys

F13, F14, F15, F16, F17, F18, F19, F20, F21, F22, F23, F24

## How It Works

### Windows
- Uses PowerShell to call Windows `user32.dll` `keybd_event` API directly
- Presses keys sequentially, then releases in reverse order
- Works with Discord, OBS, and other applications that support F13-F24 hotkeys

### Linux
- Uses `xdotool` to simulate key presses
- Command format: `xdotool keydown F13 keydown F14 keyup F14 keyup F13`
- Works with most X11-based applications

## Troubleshooting

### Windows
- If keys aren't registering, ensure the target application is in focus
- Some games with anti-cheat may block simulated key presses

### Linux
- If you get "xdotool: command not found", install xdotool
- If keys don't work, ensure you're running X11 (not Wayland)
- For Wayland support, you may need additional tools like `ydotool`

## Notes

- The server listens on port 8686
- The `isSync` parameter is kept for backwards compatibility but not currently used
- Key combinations are pressed together (like Ctrl+C) not sequentially
