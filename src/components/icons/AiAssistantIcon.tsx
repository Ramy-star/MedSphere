'use client';
import { cn } from "@/lib/utils";
import React from "react";
import Image from "next/image";

// Simplified the component to only accept basic HTML props to avoid type conflicts with LucideProps.
export const AiAssistantIcon = React.forwardRef<HTMLImageElement, React.HTMLAttributes<HTMLImageElement>>(
  ({ className, ...props }, ref) => (
    <Image
      src="/ai-assistant-icon.svg"
      alt="AI Assistant"
      width={24}
      height={24}
      className={cn(className)}
      {...props} // Pass only basic compatible props
      ref={ref}
    />
  )
);

AiAssistantIcon.displayName = "AiAssistantIcon";
