# 📷 TimeStamp - Photo Timestamp App

A Progressive Web App that captures photos and automatically overlays timestamps with date and time.

## Features

- 📸 Real-time camera capture with front/back camera switching
- 🕐 Automatic timestamp overlay on photos
- 🖼️ Photo gallery with view, download, and delete
- ⚙️ Customizable timestamp (position, format, color)
- 💾 Local storage persistence
- 📱 PWA support for "Add to Home Screen"

## Usage

### On Desktop
1. Visit the app URL
2. Allow camera access when prompted
3. Click the capture button to take timestamped photos

### On iPhone
1. Open in Safari
2. Tap Share → Add to Home Screen
3. Open from home screen for fullscreen experience

## Settings

Customize your timestamp:
- **Position**: Bottom Right, Bottom Left, Top Right, Top Left
- **Format**: Full, Short, Date Only, Time Only
- **Color**: White, Gold, Red, Teal
- **Quality**: High, Medium (1080p), Low (720p)

## Tech Stack

- Vanilla HTML, CSS, JavaScript
- MediaDevices API for camera access
- Canvas API for timestamp rendering
- LocalStorage for photo persistence
- PWA manifest for native app experience

## License

MIT
