"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code, Menu } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NavLinks = ({ className }: { className?: string }) => (
    <nav className={cn("flex items-center gap-6 text-sm", className)}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setIsMobileMenuOpen(false)}
          className={cn(
            "font-medium transition-colors hover:text-primary",
            pathname === item.href
              ? "text-primary"
              : "text-foreground/70"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Code className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">
              React Starter
            </span>
          </Link>
          <NavLinks />
        </div>

        <div className="flex flex-1 items-center justify-between md:justify-end">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <div className="md:hidden">
                <Link href="/" className="flex items-center space-x-2">
                    <Code className="h-6 w-6 text-primary" />
                    <span className="font-bold">React Starter</span>
                </Link>
            </div>
            <SheetContent side="left" className="pr-0">
              <div className="flex h-full flex-col">
                <div className="flex items-center border-b pb-4 pl-6">
                    <Link href="/" className="flex items-center space-x-2" onClick={() => setIsMobileMenuOpen(false)}>
                        <Code className="h-6 w-6 text-primary" />
                        <span className="font-bold">React Starter</span>
                    </Link>
                </div>
                <div className="mt-6 pl-6">
                  <NavLinks className="flex-col items-start gap-4" />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
