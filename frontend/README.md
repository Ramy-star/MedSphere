# Voice Assistant Frontend

A modern, production-ready React frontend for an AI-powered voice assistant with real-time speech recognition, text-to-speech, and an interactive animated avatar.

## Features

### 🎨 Modern UI/UX
- ChatGPT/Claude-inspired interface with soft glass morphism
- Responsive design (desktop + mobile with collapsible sidebar)
- Light/dark theme toggle
- Smooth animations and transitions
- Accessible keyboard navigation

### 🎤 Voice Capabilities
- Real-time voice recording with audio visualization
- Audio transcription via backend API
- Text-to-speech playback with controls
- Fallback file upload for audio input
- Microphone permission handling

### 🤖 Interactive Avatar
- SVG-based animated character
- Multiple states: idle, listening, thinking, speaking
- Audio-reactive animations (mouth movements, wave visualizer)
- Eye tracking that follows cursor
- Smooth floating animations

### 💬 Chat Features
- Multiple conversation management
- Conversation search and filtering
- Message history with timestamps
- Typing indicators and loading states
- Copy messages to clipboard
- Export/import conversations as JSON

### 🧠 Model Brain Editor
- Customizable AI personality and instructions
- Define tone, language preferences, and behavior
- Toggle Model Brain per conversation
- Persistent configuration in localStorage

### 💾 Data Persistence
- All conversations saved to localStorage
- Theme preferences saved
- Model Brain configuration saved
- Export/import functionality for backup

## Project Structure

```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx           # Top navigation with theme toggle
│   │   ├── Sidebar.jsx          # Conversation list and management
│   │   ├── ChatWindow.jsx       # Main chat interface
│   │   ├── MessageBubble.jsx    # Individual message display
│   │   ├── RecorderButton.jsx   # Voice recording control
│   │   ├── TTSButton.jsx        # Text-to-speech playback
│   │   └── Avatar.jsx           # Interactive animated avatar
│   ├── pages/
│   │   └── Home.jsx             # Main application page
│   ├── utils/
│   │   └── api.js               # API client for backend
│   ├── App.jsx                  # Root component
│   ├── main.jsx                 # React entry point
│   └── index.css                # Global styles with Tailwind
├── index.html                    # HTML entry point
├── package.json                  # Dependencies and scripts
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS configuration
└── README.md                     # This file
```

## Prerequisites

- Node.js 16+ and npm
- Backend server running with the following endpoints:
  - `POST /api/transcribe` - Audio transcription
  - `POST /api/chat` - Chat completion
  - `POST /api/tts` - Text-to-speech generation

## Installation & Setup

### 1. Navigate to the frontend directory

```bash
cd frontend
```

### 2. Install dependencies

```bash
npm install
```

This will install all required packages:
- React 18
- Vite
- TailwindCSS
- Axios
- Heroicons
- date-fns

### 3. Configure backend proxy (if needed)

The frontend is configured to proxy API requests to `http://localhost:8000` by default. If your backend runs on a different port, edit `vite.config.js`:

```javascript
export default defineConfig({
  // ...
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:YOUR_PORT', // Change this
        changeOrigin: true,
      },
    },
  },
});
```

### 4. Start the development server

```bash
npm run dev
```

The application will start at `http://localhost:3000`

### 5. Build for production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### 6. Preview production build

```bash
npm run preview
```

## Backend Requirements

The frontend expects the following API endpoints:

### POST /api/transcribe
**Request:**
- Content-Type: `multipart/form-data`
- Body: Audio file (field name: `file`)

**Response:**
```json
{
  "text": "transcribed text",
  "transcription": "transcribed text"
}
```

### POST /api/chat
**Request:**
```json
{
  "prompt": "user message with optional model brain context",
  "text": "user message",
  "conversationId": "optional-conversation-id"
}
```

**Response:**
```json
{
  "response": "assistant reply",
  "message": "assistant reply",
  "text": "assistant reply"
}
```

### POST /api/tts
**Request:**
```json
{
  "text": "text to convert to speech"
}
```

**Response:**
- Either: JSON with file path: `{ "path": "/audio/file.mp3" }`
- Or: Audio binary (blob) with appropriate Content-Type header

## Usage

### First Time Setup

1. Open the application in your browser
2. You'll see an onboarding tooltip explaining the controls
3. Click the settings icon (⚙️) to configure the Model Brain
4. Start a conversation by typing or using voice input

### Voice Recording

1. Click the large microphone button to start recording
2. Speak your message
3. Click the stop button to finish recording
4. Audio will be automatically transcribed and sent to the chat

### Text-to-Speech

- Assistant messages include a speaker icon (🔊)
- Click to play/replay the message audio
- Avatar animates while speaking

### Model Brain

1. Click the settings icon in the navbar
2. Toggle "Enable Model Brain" to activate
3. Enter personality instructions, e.g.:
   ```
   You are a helpful assistant named Sarah.
   Age: 28
   Profession: Customer Support Specialist
   Tone: Friendly and empathetic
   Always respond in a conversational manner.
   When asked in Arabic, respond in Egyptian Arabic.
   ```
4. Save and close

### Keyboard Shortcuts

- `Enter` - Send message
- `Shift+Enter` - New line in message input
- `Tab` - Navigate between controls

## Customization

### Theme Colors

Edit `src/index.css` at the top to change theme colors:

```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #111827;
  --accent-primary: #0ea5e9;
  /* ... more variables ... */
}
```

### Tailwind Configuration

Modify `tailwind.config.js` to customize colors, fonts, and animations:

```javascript
theme: {
  extend: {
    colors: {
      primary: { /* custom colors */ },
      secondary: { /* custom colors */ },
    },
  },
},
```

## Troubleshooting

### Microphone not working
- Check browser permissions (must allow microphone access)
- Use HTTPS (required for getUserMedia in production)
- Fallback: Upload audio files instead

### API errors
- Ensure backend is running and accessible
- Check proxy configuration in `vite.config.js`
- Check browser console for detailed error messages
- Verify API endpoints match backend implementation

### Audio playback issues
- Check browser audio permissions
- Ensure backend returns valid audio format
- Check console for CORS or network errors

### Build errors
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Clear Vite cache: `npm run build -- --force`

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Modern mobile browsers

## License

MIT License - feel free to use in your projects!

## Credits

Built with:
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Heroicons](https://heroicons.com/)
- [Axios](https://axios-http.com/)
