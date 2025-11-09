import { Counter } from '@/components/starter/counter';
import { GreetingCard } from '@/components/starter/greeting-card';
import { NameForm } from '@/components/starter/name-form';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full bg-background font-body">
      <main className="flex-1 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
        <div className="container mx-auto max-w-3xl px-4 py-12 md:py-20">
          <div className="space-y-12">
            <header className="text-center space-y-2">
              <h1 className="text-4xl sm:text-5xl font-headline font-bold tracking-tight text-foreground">
                React Starter
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A simple app to demonstrate core React features like components, props, state, and event handling.
              </p>
            </header>

            <div className="space-y-8">
              <GreetingCard name="Developer" />
              <Counter />
              <NameForm />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
