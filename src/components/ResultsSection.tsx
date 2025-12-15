import { RefreshCw, Lightbulb, User, MapPin, BookOpen } from "lucide-react";
import { IdeaCard } from "./IdeaCard";
import { Button } from "./ui/button";

interface Suggestions {
  plot: string[];
  names: string[];
  settings: string[];
  titles: string[];
}

interface ResultsSectionProps {
  suggestions: Suggestions | null;
  isLoading: boolean;
  onRegenerate: (category: keyof Suggestions) => void;
  onSaveIdea: (idea: string, category: string) => void;
  regeneratingCategory: string | null;
}

const categoryConfig = {
  plot: {
    title: "Plot Ideas",
    icon: Lightbulb,
    description: "Story directions, twists, and arcs",
  },
  names: {
    title: "Name Ideas",
    icon: User,
    description: "Characters, places, and objects",
  },
  settings: {
    title: "Setting Ideas",
    icon: MapPin,
    description: "Locations, atmospheres, and worlds",
  },
  titles: {
    title: "Title Ideas",
    icon: BookOpen,
    description: "Story and chapter titles",
  },
};

export function ResultsSection({
  suggestions,
  isLoading,
  onRegenerate,
  onSaveIdea,
  regeneratingCategory,
}: ResultsSectionProps) {
  if (isLoading && !suggestions) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(categoryConfig).map(([key, config]) => (
          <div key={key} className="category-section animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-5 w-24 bg-muted rounded" />
                <div className="h-3 w-36 bg-muted rounded" />
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!suggestions) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(Object.entries(categoryConfig) as [keyof Suggestions, typeof categoryConfig.plot][]).map(
        ([key, config]) => {
          const Icon = config.icon;
          const isRegenerating = regeneratingCategory === key;

          return (
            <div key={key} className="category-section animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {config.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRegenerate(key)}
                  disabled={isRegenerating}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isRegenerating ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>
              </div>

              <div className="space-y-3">
                {isRegenerating ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : (
                  suggestions[key]?.map((idea, index) => (
                    <IdeaCard
                      key={`${key}-${index}`}
                      idea={idea}
                      category={key}
                      onSave={onSaveIdea}
                    />
                  ))
                )}
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}
