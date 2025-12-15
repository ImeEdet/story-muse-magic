import { Copy, Heart, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface IdeaCardProps {
  idea: string;
  category: "plot" | "names" | "settings" | "titles";
  onSave: (idea: string, category: string) => void;
}

export function IdeaCard({ idea, category, onSave }: IdeaCardProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(idea);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Idea copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSave(idea, category);
    setSaved(true);
    toast({
      title: "Saved!",
      description: "Added to your Notebook",
    });
  };

  return (
    <div className="idea-card group animate-fade-in">
      <p className="text-foreground mb-3 leading-relaxed">{idea}</p>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="p-2 rounded-md hover:bg-secondary transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-4 w-4 text-forest" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={saved}
          className="p-2 rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
          title="Save to Notebook"
        >
          <Heart
            className={`h-4 w-4 ${saved ? "fill-primary text-primary" : "text-muted-foreground"}`}
          />
        </button>
      </div>
    </div>
  );
}
