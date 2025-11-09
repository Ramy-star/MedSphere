import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Gift } from 'lucide-react';

type GreetingCardProps = {
  name: string;
};

export function GreetingCard({ name }: GreetingCardProps) {
  return (
    <section aria-labelledby="greeting-title">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="bg-primary/20 p-3 rounded-lg">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle id="greeting-title" className="font-headline text-xl">Hello, {name}!</CardTitle>
            <CardDescription>This component demonstrates passing data using props.</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </section>
  );
}
