
"use client";

import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768; // md breakpoint

export function useIsMobile() {
  // Initialize state to `true` on the server, and `undefined` on the client until mounted.
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Check on mount
    checkIsMobile();
    
    // Add listener
    window.addEventListener("resize", checkIsMobile);
    
    // Cleanup
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Return false if on server, otherwise the calculated value.
  // This prevents hydration mismatches.
  return isMobile === undefined ? false : isMobile;
}
