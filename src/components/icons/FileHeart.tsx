
import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react";
import React from "react";

export const FileHeart = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ className, ...props }, ref) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("lucide lucide-file-heart", className)}
        ref={ref}
        {...props}
    >
      <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
      <path d="M14 2v6h6" />
      <path d="M10.19 14.34a2.21 2.21 0 0 0-2.68 0A2.48 2.48 0 0 0 6.5 16a2.48 2.48 0 0 0 1.01 1.66 2.21 2.21 0 0 0 2.68 0A2.48 2.48 0 0 0 11.2 16a2.48 2.48 0 0 0-1.01-1.66Z" />
    </svg>
  )
);

FileHeart.displayName = 'FileHeart';
