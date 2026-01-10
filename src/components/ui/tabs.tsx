
"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const listRef = React.useRef<HTMLDivElement>(null);
  const markerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    const moveMarker = () => {
      const marker = markerRef.current;
      const activeTab = listElement.querySelector<HTMLElement>('[data-state="active"]');
      if (marker && activeTab) {
        const { offsetLeft, offsetWidth } = activeTab;
        marker.style.width = `${offsetWidth}px`;
        marker.style.transform = `translateX(${offsetLeft}px)`;
      }
    };
    
    // Move marker on initial load
    moveMarker();

    // The MutationObserver watches for changes in attributes of the children (i.e., data-state)
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-state') {
                moveMarker();
                break;
            }
        }
    });

    observer.observe(listElement, {
        attributes: true,
        childList: true,
        subtree: true,
    });

    return () => observer.disconnect();
  }, []);


  return (
    <div className="relative">
      <TabsPrimitive.List
        ref={listRef}
        className={cn(
          "inline-flex h-12 items-center justify-center rounded-full bg-black/20 p-1 text-slate-300",
          className
        )}
        {...props}
      />
      <div
        ref={markerRef}
        className="absolute left-0 top-1.5 h-9 origin-left rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md transition-all duration-700 ease-[cubic-bezier(0.68,-0.55,0.27,1.55)]"
      ></div>
    </div>
  );
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-white data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

    