import { X } from "lucide-react";

interface SelectedVibesTagsProps {
  vibes: string[];
  onRemove: (vibe: string) => void;
}

export function SelectedVibesTags({ vibes, onRemove }: SelectedVibesTagsProps) {
  if (vibes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {vibes.map((vibe) => (
        <span
          key={vibe}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium"
        >
          {vibe}
          <button
            onClick={() => onRemove(vibe)}
            className="hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
