'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2 } from 'lucide-react';
import { suggestMedicalStudyTags } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";

interface TagSuggesterProps {
  fileContent: string;
}

export function TagSuggester({ fileContent }: TagSuggesterProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSuggestTags = async () => {
    setIsLoading(true);
    setTags([]);
    const result = await suggestMedicalStudyTags({ fileContent });
    setIsLoading(false);
    if (result.success && result.data?.tags) {
      setTags(result.data.tags);
    } else {
        toast({
            variant: "destructive",
            title: "AI Error",
            description: result.error || "Could not generate tags.",
        });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-glass-border bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-highlight">AI Tag Suggestions</h4>
        <Button size="sm" className="btn-gradient" onClick={handleSuggestTags} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Suggest Tags
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="bg-primary/50 border-primary text-primary-foreground">
              {tag}
            </Badge>
          ))}
        </div>
      )}
       {isLoading && (
        <div className="flex flex-wrap gap-2">
            <p className="text-sm text-muted-foreground flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing content and generating tags...
            </p>
        </div>
      )}
    </div>
  );
}
