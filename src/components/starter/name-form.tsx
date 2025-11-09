"use client";

import { type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function NameForm() {
  const { toast } = useToast();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    
    if (name) {
      toast({
        title: "Submission Received!",
        description: `Thanks for submitting, ${name}!`,
      });
      event.currentTarget.reset();
    }
  };

  return (
    <section aria-labelledby="form-title">
      <Card>
        <CardHeader>
          <CardTitle id="form-title" className="font-headline text-xl">Form Events</CardTitle>
          <CardDescription>This component demonstrates handling `onSubmit` events from a form.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name-input">Your Name</Label>
              <Input id="name-input" name="name" placeholder="e.g., Jane Doe" required />
            </div>
            <Button type="submit" className="w-full sm:w-auto">Submit</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
