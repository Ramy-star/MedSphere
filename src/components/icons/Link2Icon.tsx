
import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react";
import React from "react";

export const Link2Icon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ className, ...props }, ref) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("lucide lucide-link-2", className)}
      ref={ref}
      {...props}
    >
      <path d="M9 17H7A5 5 0 0 1 7 7h2"/>
      <path d="M15 7h2a5 5 0 1 1 0 10h-2"/>
      <line x1="8" x2="16" y1="12" y2="12"/>
    </svg>
  )
);

Link2Icon.displayName = 'Link2Icon';
