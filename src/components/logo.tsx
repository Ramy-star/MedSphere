import { cn } from "@/lib/utils";

export const Logo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 258 258"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-8 w-8", className)}
  >
    <defs>
      <radialGradient
        id="eyeGradient"
        cx="0.5"
        cy="0.5"
        r="0.5"
        fx="0.5"
        fy="0.5"
      >
        <stop offset="0%" stopColor="#2E3A87" />
        <stop offset="40%" stopColor="#5D68B1" />
        <stop offset="80%" stopColor="#A5B4FC" />
        <stop offset="100%" stopColor="#FFFFFF" />
      </radialGradient>
    </defs>
    <circle cx="129" cy="129" r="129" fill="#3B82F6" />
    <path
      d="M89.7617 186.299C128.079 238.995 194.512 212.723 181.71 149.333C168.908 85.9431 106.918 51.5234 71.9333 93.385C36.9488 135.247 51.4445 133.602 89.7617 186.299Z"
      stroke="white"
      strokeWidth="12"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <circle cx="71" cy="71" r="22" fill="url(#eyeGradient)" />
    <circle cx="187" cy="187" r="22" fill="url(#eyeGradient)" />
  </svg>
);
