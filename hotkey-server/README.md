# Hotkey Server

Cross-platform WebSocket server for triggering keyboard shortcuts remotely from a mobile app.

## Supported Platforms

- **Windows**: Uses PowerShell with native Windows API (`keybd_event`)
- **Linux**: Uses `dotool` for uinput-based key injection (works on X11, Wayland, and TTYs)

## Requirements

### Windows
- No additional requirements - uses built-in PowerShell

### Linux

- `dotool` must be installed. See [installation guide](https://git.sr.ht/~geb/dotool)
- Your user must be in the `input` group:

  ```bash
  sudo usermod -aG input $USER
  # Log out and back in for changes to take effect
  ```

- Reload udev rules (one-time setup):

  ```bash
  sudo udevadm control --reload && sudo udevadm trigger
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
- Uses `dotool` to simulate key presses via uinput
- Command format: `echo 'keydown f13; keydown f14; keyup f14; keyup f13' | dotool`
- Works on X11, Wayland, and even TTYs
- Does not require window focus (unlike xdotool)

## Troubleshooting

### Windows
- If keys aren't registering, ensure the target application is in focus
- Some games with anti-cheat may block simulated key presses

### Linux
- If you get "dotool: command not found", install dotool from https://git.sr.ht/~geb/dotool
- If you get permission errors, ensure your user is in the `input` group
- Make sure udev rules are loaded (see Requirements section above)

## Notes

- The server listens on port 8686
- The `isSync` parameter is kept for backwards compatibility but not currently used
- Key combinations are pressed together (like Ctrl+C) not sequentially
