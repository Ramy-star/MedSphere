#  медична сфера  मेडस्फेयर MedSphere

<p align="center">
  <img src="public/logo.svg" alt="MedSphere Logo" width="120">
</p>

<h3 align="center">Your Digital Study Companion for Medical Education</h3>

<p align="center">
  MedSphere is a modern, intuitive web application designed to help medical students organize their complex study materials efficiently. From lecture notes and research papers to videos and presentations, MedSphere provides a centralized hub for all your academic needs, powered by a robust and scalable tech stack.
</p>

---

## ✨ Features

-   **🗂️ Hierarchical Organization:** Structure your content by academic levels, semesters, and subjects.
-   **📤 Seamless File Uploads:** Upload files of any type directly to your folders, powered by Cloudinary.
-   **👁️ Rich File Previews:** Instantly preview PDFs, images, videos, and even HTML files directly within the app.
-   **🖱️ Drag & Drop Interface:** Easily reorder files and folders with a smooth, intuitive drag-and-drop experience.
-   **🔍 Powerful Search:** Quickly find any file or folder across your entire library.
-   **📱 Fully Responsive:** Access and manage your study materials on any device, whether it's a desktop, tablet, or smartphone.
-   **🤖 AI-Powered (Coming Soon):** Future-proofed with Genkit integration for upcoming AI features.

---

## 🛠️ Built With

This project is built with a modern, scalable, and type-safe technology stack:

-   **[Next.js](https://nextjs.org/)** - The React Framework for the Web.
-   **[React](https://reactjs.org/)** - A JavaScript library for building user interfaces.
-   **[TypeScript](https://www.typescriptlang.org/)** - Strong-typed programming language that builds on JavaScript.
-   **[Tailwind CSS](https://tailwindcss.com/)** - A utility-first CSS framework for rapid UI development.
-   **[ShadCN UI](https://ui.shadcn.com/)** - Re-usable components built using Radix UI and Tailwind CSS.
-   **[Firebase](https://firebase.google.com/)** - Used for database (Firestore), authentication, and storage rules.
-   **[Cloudinary](https://cloudinary.com/)** - Handles all file storage, uploads, and delivery.
-   **[Genkit](https://firebase.google.com/docs/genkit)** - The open-source framework for building production-ready AI-powered apps.
-   **[Lucide React](https://lucide.dev/)** - Beautiful & consistent icons.

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

-   Node.js (v18 or later)
-   npm, yarn, or pnpm

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/medsphere.git
    cd medsphere
    ```

2.  **Install NPM packages:**
    ```sh
    npm install
    ```

3.  **Set up environment variables:**

    Create a file named `.env.local` in the root of your project and add the following environment variables.

    ```bash
    # Firebase Configuration (find these in your Firebase project settings)
    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_SENDER_ID"
    NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"

    # Cloudinary Configuration (find these in your Cloudinary dashboard)
    CLOUDINARY_CLOUD_NAME="YOUR_CLOUD_NAME"
    CLOUDINARY_API_KEY="YOUR_API_KEY"
    CLOUDINARY_API_SECRET="YOUR_API_SECRET"

    # Google AI (for Genkit)
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

    # Local Development (optional)
    # Set to "true" to use local Firebase emulators
    NEXT_PUBLIC_USE_EMULATORS="false"
    ```

### Running the Application

1.  **Run the development server:**
    ```sh
    npm run dev
    ```

2.  Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

---

## 📂 File Structure

The project follows the standard Next.js App Router structure.

-   `src/app/`: Contains all the pages and layouts for the application.
    -   `(main)/`: Route group for the main authenticated part of the app.
    -   `api/`: API routes for server-side functions like signing Cloudinary requests.
-   `src/components/`: Shared React components.
    -   `ui/`: Components from ShadCN UI.
-   `src/lib/`: Core application logic, services, and utilities.
    -   `contentService.ts`: Handles all CRUD operations for files/folders with Firestore and Cloudinary.
    -   `firebase.ts`: Firebase initialization and configuration.
-   `src/firebase/`: Contains custom React hooks and providers for interacting with Firebase.
-   `src/ai/`: Contains Genkit flows and AI-related logic.
-   `public/`: Static assets like images and icons.
