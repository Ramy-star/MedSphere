import { headers } from 'next/headers';
import Image from 'next/image';
import { Suspense } from 'react';
import EmptyStateSuggestions from '@/components/empty-state-suggestions';
import EmptyStateSkeleton from '@/components/empty-state-skeleton';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function NotFound() {
  const headersList = headers();
  const domain = headersList.get('x-forwarded-host') || '';
  const path = headersList.get('next-url') || '/';
  // Reconstruct the full URL to pass to the AI flow
  const fullUrl = `${headersList.get('x-forwarded-proto') || 'https'}://${domain}${path}`;

  const image = PlaceHolderImages.find(img => img.id === 'empty-state-art');

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-6 text-center">
      <div className="max-w-2xl">
        {image && (
          <Image
            src={image.imageUrl}
            alt={image.description}
            width={400}
            height={267}
            data-ai-hint={image.imageHint}
            className="mx-auto rounded-lg shadow-xl mb-8 animate-in fade-in-0 zoom-in-95 duration-500"
          />
        )}
        <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Oops! This page is lost.
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          The page you're looking for seems to have vanished into thin air. Don't worry, our AI can help you find your way.
        </p>

        <Suspense fallback={<EmptyStateSkeleton />}>
          <EmptyStateSuggestions path={fullUrl} />
        </Suspense>
      </div>
    </main>
  );
}
