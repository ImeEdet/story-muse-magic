import { vibeCategories } from "@/lib/vibes";
import { cn } from "@/lib/utils";

interface VibeSelectorProps {
  selectedVibes: string[];
  onVibesChange: (vibes: string[]) => void;
}

export function VibeSelector({ selectedVibes, onVibesChange }: VibeSelectorProps) {
  const toggleVibe = (vibe: string) => {
    if (selectedVibes.includes(vibe)) {
      onVibesChange(selectedVibes.filter((v) => v !== vibe));
    } else {
      onVibesChange([...selectedVibes, vibe]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-semibold text-foreground">Select Your Story Vibes</h3>
        {selectedVibes.length > 0 && (
          <button
            onClick={() => onVibesChange([])}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all ({selectedVibes.length})
          </button>
        )}
      </div>
      
      {vibeCategories.map((category) => (
        <div key={category.name} className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {category.name}
          </h4>
          <div className="flex flex-wrap gap-2">
            {category.vibes.map((vibe) => {
              const isSelected = selectedVibes.includes(vibe);
              return (
                <button
                  key={vibe}
                  onClick={() => toggleVibe(vibe)}
                  className={cn(
                    "vibe-tag",
                    isSelected ? "vibe-tag-selected" : "vibe-tag-unselected"
                  )}
                >
                  {vibe}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
