'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FlaskConical, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/", label: "Study Materials" },
  { href: "/qa", label: "Q&A" },
  { href: "/community", label: "Community" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="p-4 flex items-center justify-between text-white border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="bg-white/10 p-2 rounded-lg">
          <FlaskConical className="text-white" />
        </div>
        <h1 className="text-xl font-bold">MedicalStudyHub</h1>
      </div>
      <nav className="hidden md:flex items-center gap-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-sm font-medium text-gray-400 hover:text-white transition-colors",
              pathname === item.href && "text-white"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-4">
        <button className="relative text-gray-400 hover:text-white">
          <Bell size={20} />
        </button>
        <Avatar className="h-8 w-8">
          <AvatarImage src="https://picsum.photos/seed/user-avatar/40/40" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
