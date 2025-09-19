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
    <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 px-10 py-3 backdrop-blur-sm bg-white/5">
      <div className="flex items-center gap-4 text-slate-800 dark:text-white">
        <div className="flex items-center justify-center rounded-lg bg-primary/10 text-primary p-2">
          <FlaskConical className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold">MedicalStudyHub</h2>
      </div>
      <nav className="hidden md:flex items-center gap-8">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-sm font-medium text-slate-300 hover:text-primary transition-colors",
              pathname === item.href && "text-primary"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-4">
        <button className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/5 hover:bg-white/10">
          <Bell className="text-slate-300" />
        </button>
        <Avatar className="h-10 w-10">
          <AvatarImage src="https://picsum.photos/seed/user-avatar/40/40" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
