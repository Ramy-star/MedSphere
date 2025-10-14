
import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react";
import React from "react";

export const CopyIcon = React.forwardRef<SVGSVGElement, LucideProps>(
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
      className={cn("lucide lucide-copy", className)}
      ref={ref}
      {...props}
    >
      <rect width="14" height="14" x="8" y="8" rx="4" ry="4" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
);

CopyIcon.displayName = 'CopyIcon';
