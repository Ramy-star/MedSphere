
import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react";
import React from "react";

export const InteractiveExamIcon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ className, ...props }, ref) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
        ref={ref}
        className={cn(className)}
        {...props}
    >
        <g clip-path="url(#a)" stroke="#ff4d4d" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 2.3c-1 0-1.9.8-1.9 1.9v4.6c0 1 .8 1.9 1.9 1.9 1 0 1.9-.8 1.9-1.9V4.1c0-1-.8-1.8-1.9-1.8m4.1 8.3h1.6c.9 0 1.6-.7 1.6-1.6s-.7-1.6-1.6-1.6-1.6.7-1.6 1.6zM2 9.2c0 1 .8 1.9 1.9 1.9h4.6c1 0 1.9-.8 1.9-1.9 0-1-.8-1.9-1.9-1.9H3.9C2.8 7.4 2 8.2 2 9.2m8.4-4.1V3.6c0-.9-.7-1.6-1.6-1.6s-1.6.7-1.6 1.6.7 1.6 1.6 1.6h1.6zm-1 16.7c1 0 1.9-.8 1.9-1.9v-4.6c0-1-.8-1.9-1.9-1.9-1 0-1.9.8-1.9 1.9v4.6c.1 1 .9 1.9 1.9 1.9m-4-8.4H3.8c-.9 0-1.6.7-1.6 1.6s.7 1.6 1.6 1.6 1.6-.7 1.6-1.6zM22 14.8c0-1-.8-1.9-1.9-1.9h-4.6c-1 0-1.9.8-1.9 1.9 0 1 .8 1.9 1.9 1.9h4.6c1 0 1.9-.9 1.9-1.9m-8.4 4v1.6c0 .9.7 1.6 1.6 1.6s1.6-.7 1.6-1.6-.7-1.6-1.6-1.6z"/>
        </g>
        <defs>
            <clipPath id="a">
                <path fill="#fff" d="M0 0h24v24H0z"/>
            </clipPath>
        </defs>
    </svg>
  )
);

InteractiveExamIcon.displayName = 'InteractiveExamIcon';
