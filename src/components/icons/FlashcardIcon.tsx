
import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react";
import React from "react";

export const FlashcardIcon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ className, ...props }, ref) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" height="14" width="14"
        ref={ref}
        className={cn(className)}
        {...props}
    >
        <defs>
            <linearGradient id="a" x1=".538" x2="16.494" y1="1.131" y2="10.125" gradientUnits="userSpaceOnUse">
                <stop stop-color="#00d078"/>
                <stop offset="1" stop-color="#007df0"/>
            </linearGradient>
        </defs>
        <path fill="url(#a)" fill-rule="evenodd" d="M7.937.723a.975.975 0 0 0-1.194-.69L.723 1.646a.975.975 0 0 0-.69 1.194l2.31 8.617c.14.52.674.828 1.194.689l6.02-1.612a.975.975 0 0 0 .69-1.194zm3.517 8.293L9.71 2.51l3.568.956c.52.14.828.674.689 1.194l-2.308 8.617a.975.975 0 0 1-1.194.69h-.001l-4.422-1.198 3.84-1.028a2.225 2.225 0 0 0 1.573-2.725" clip-rule="evenodd"/>
    </svg>
  )
);

FlashcardIcon.displayName = 'FlashcardIcon';
