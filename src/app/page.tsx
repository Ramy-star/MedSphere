import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Ghost, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full shadow-2xl animate-in fade-in-0 zoom-in-95 duration-500">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="font-headline text-3xl font-bold text-foreground">
            EmptyState Magic
          </h1>
          <p className="mt-4 text-muted-foreground">
            This application demonstrates AI-powered content suggestions when a page or file is not found.
          </p>
          <Button asChild className="mt-8 w-full" size="lg">
            <Link href="/a-deleted-page-example">
              <Ghost className="mr-2" />
              See it in Action
            </Link>
          </Button>
        </CardContent>
      </Card>
      <footer className="mt-8 text-sm text-muted-foreground">
        Built with Next.js, Genkit, and ShadCN UI.
      </footer>
    </main>
  );
}
