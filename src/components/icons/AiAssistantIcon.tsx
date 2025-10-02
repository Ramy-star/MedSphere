
import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react";
import React from "react";
import Image from "next/image";

export const AiAssistantIcon = React.forwardRef<HTMLImageElement, Omit<LucideProps, 'ref'>>(
  ({ className, ...props }, ref) => (
    <Image
      src="/ai-assistant-icon.svg"
      alt="AI Assistant"
      width={24}
      height={24}
      className={cn(className)}
      {...props}
      ref={ref}
    />
  )
);

AiAssistantIcon.displayName = "AiAssistantIcon";
