# **App Name**: MedicalStudyHub

## Core Features:

- Dashboard View: Display the years in a sidebar and semesters in tabs. Subject folders in a glass morphism grid.
- Subject Page: Display the folder tree and files in a grid on the selected subject page.
- File Card: Glass card component to display the file thumbnail, title, metadata, and preview/download buttons.
- Preview Modal: Glass modal component to display the file preview, allow downloads, and trap keyboard focus.
- Sidebar Years: Vertical sidebar component to display the years, highlighting the active year.
- Mock Data: Uses mock in-memory data to populate components, so that components are functional without the need for the backend.
- AI-Powered Tagging Suggestions: Suggests tags to use for medical studies using a LLM tool.

## Style Guidelines:

- Background color: Dark canvas (#0B0F12).
- Glass surface: Translucent overlay (rgba(255,255,255,0.04)).
- Glass border: Subtle border (rgba(255,255,255,0.06)).
- Primary color: Dark greenish-gray (#2F6B5B).
- Accent color: Soft mint (#A7E3C0).
- Highlight color: Near-white (#E6F7EE).
- Primary text: Near-white for contrast (#E6F0EB).
- Muted text: Semi-transparent near-white (rgba(230,240,235,0.6)).
- Headings: 'Inter' sans-serif, fallback to system fonts.
- Body: 'Roboto' sans-serif, fallback to system fonts.
- Lucide-react icons with white/near-white strokes.
- Glassmorphism cards with subtle drop shadows on the dark background.
- Rounded buttons with gradients or neon outlines using primary and accent colors.
- Framer Motion: subtle hover scale (1.02), modal fade+scale, folder expand slide.