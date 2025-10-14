import Link from 'next/link';
import {
  FileText,
  Home,
  Lightbulb,
  Mail,
  Search,
  ChevronRight,
} from 'lucide-react';
import { getSuggestions } from '@/app/actions';

const getSuggestionProps = (suggestion: string): { icon: React.ReactNode; href: string } => {
  const lowerCaseSuggestion = suggestion.toLowerCase();
  
  if (lowerCaseSuggestion.includes('home')) {
    return { icon: <Home />, href: '/' };
  }
  if (lowerCaseSuggestion.includes('search')) {
    return { icon: <Search />, href: '/search' };
  }
  if (lowerCaseSuggestion.includes('doc') || lowerCaseSuggestion.includes('file')) {
    return { icon: <FileText />, href: '#' };
  }
  if (lowerCaseSuggestion.includes('contact')) {
    return { icon: <Mail />, href: '/contact' };
  }
  return { icon: <Lightbulb />, href: '#' };
};

export default async function EmptyStateSuggestions({ path }: { path: string }) {
  const suggestions = await getSuggestions(path);

  return (
    <div className="mt-8 w-full max-w-sm animate-in fade-in-0 slide-in-from-bottom-5 duration-500">
      <h3 className="mb-4 text-lg font-semibold text-foreground">
        Here are some suggestions:
      </h3>
      <ul className="space-y-3">
        {suggestions.map((suggestion, index) => {
          const { icon, href } = getSuggestionProps(suggestion);
          return (
            <li key={index}>
              <Link href={href}>
                <div className="group flex items-center justify-between rounded-lg border bg-card p-4 text-card-foreground transition-all hover:border-primary hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <span className="text-primary">{icon}</span>
                    <span className="font-medium">{suggestion}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
