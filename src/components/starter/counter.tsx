"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus, RotateCcw } from 'lucide-react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <section aria-labelledby="counter-title">
      <Card>
        <CardHeader>
          <CardTitle id="counter-title" className="font-headline text-xl">State and Events</CardTitle>
          <CardDescription>This demonstrates `useState` for state management and `onClick` for event handling.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 pt-4">
          <p className="text-7xl font-bold text-primary tabular-nums tracking-tighter">{count}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setCount(c => c - 1)} aria-label="Decrement count">
              <Minus className="h-5 w-5" />
            </Button>
            <Button size="icon" onClick={() => setCount(c => c + 1)} aria-label="Increment count">
              <Plus className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCount(0)} disabled={count === 0} aria-label="Reset count">
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
