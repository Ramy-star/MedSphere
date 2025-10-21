import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] text-center p-4">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl font-headline">
          Welcome to React Starter
        </h1>
        <p className="max-w-[700px] text-foreground/80 md:text-xl">
          A clean and modern foundation for your next project. Built with
          Next.js, TypeScript, and ShadCN/UI.
        </p>
      </div>
      <div className="mt-8">
        <Button asChild size="lg" variant="default">
          <Link href="/about">
            Learn More <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
