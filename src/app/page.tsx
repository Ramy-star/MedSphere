'use client';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  FolderPlus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full bg-[#0d121c] p-4 gap-4">
      <Sidebar />
      <main className="flex flex-1 flex-col gap-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
        <header className="flex h-16 items-center justify-end gap-4 px-6 border-b border-slate-800">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search files, subjects, or content..."
              className="w-full bg-slate-800 border-slate-700 rounded-lg pl-10 pr-4 text-sm"
            />
          </div>
          <Button variant="outline" className="bg-slate-800 border-slate-700">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="relative w-full max-w-4xl">
            <div className="absolute -top-16 left-16 text-purple-400/50">
              <Search size={48} strokeWidth={1} />
            </div>
            <div className="absolute -top-12 right-16 text-green-400/50">
              <FolderPlus size={48} strokeWidth={1} />
            </div>
            <div className="text-center">
              <div className="inline-block bg-blue-500/10 text-blue-400 p-4 rounded-full mb-6">
                <BookOpen size={48} strokeWidth={1.5} />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">
                Welcome to Your Medical Study Hub
              </h1>
              <p className="text-slate-400 max-w-2xl mx-auto mb-8">
                Select an academic level, semester, and subject from the sidebar
                to start organizing your medical study materials. Create
                folders, upload files, and track your progress through your
                medical education journey.
              </p>
              <ul className="inline-flex flex-col sm:flex-row sm:gap-8 gap-2 text-left">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                  <span className="text-slate-300">
                    Organize by Academic Levels (1-5)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-400"></span>
                  <span className="text-slate-300">
                    Navigate through Semesters
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-400"></span>
                  <span className="text-slate-300">
                    Manage Subject Content & Files
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
