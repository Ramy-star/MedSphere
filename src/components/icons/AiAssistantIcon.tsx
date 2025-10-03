'use client';
import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react";
import React from "react";
import Image from "next/image";

// The LucideProps type includes props like 'strokeWidth' which are not valid for the next/image component.
// We are destructuring them here to prevent them from being passed down to the Image component via `...rest`.
export const AiAssistantIcon = React.forwardRef<HTMLImageElement, LucideProps>(
  ({ className, strokeWidth, ...rest }, ref) => (
    <Image
      src="/ai-assistant-icon.svg"
      alt="AI Assistant"
      width={24}
      height={24}
      className={cn(className)}
      {...rest}
      ref={ref}
    />
  )
);

AiAssistantIcon.displayName = "AiAssistantIcon";
