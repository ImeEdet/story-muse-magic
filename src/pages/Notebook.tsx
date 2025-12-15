import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Check, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SavedIdea {
  id: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  plot: "Plot Ideas",
  names: "Name Ideas",
  settings: "Setting Ideas",
  titles: "Title Ideas",
};

export default function Notebook() {
  const [ideas, setIdeas] = useState<SavedIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchIdeas();
  }, []);

  const fetchIdeas = async () => {
    try {
      const { data, error } = await supabase
        .from("saved_ideas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIdeas(data || []);
    } catch (error) {
      console.error("Error fetching ideas:", error);
      toast({
        title: "Error loading ideas",
        description: "Could not load your saved ideas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteIdea = async (id: string) => {
    try {
      const { error } = await supabase.from("saved_ideas").delete().eq("id", id);

      if (error) throw error;

      setIdeas(ideas.filter((idea) => idea.id !== id));
      toast({
        title: "Deleted",
        description: "Idea removed from your notebook",
      });
    } catch (error) {
      console.error("Error deleting idea:", error);
      toast({
        title: "Delete failed",
        description: "Could not delete the idea",
        variant: "destructive",
      });
    }
  };

  const copyIdea = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copied!",
      description: "Idea copied to clipboard",
    });
  };

  const filteredIdeas =
    filterCategory === "all"
      ? ideas
      : ideas.filter((idea) => idea.category === filterCategory);

  const groupedIdeas = filteredIdeas.reduce((acc, idea) => {
    const category = idea.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(idea);
    return acc;
  }, {} as Record<string, SavedIdea[]>);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">My Notebook</h2>
            <p className="text-muted-foreground mt-1">
              Your saved story ideas ({ideas.length} total)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="plot">Plot Ideas</SelectItem>
                <SelectItem value="names">Name Ideas</SelectItem>
                <SelectItem value="settings">Setting Ideas</SelectItem>
                <SelectItem value="titles">Title Ideas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-4">Your notebook is empty</p>
            <p className="text-sm text-muted-foreground">
              Save ideas from the main page by clicking the heart icon
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedIdeas).map(([category, categoryIdeas]) => (
              <div key={category} className="space-y-4">
                <h3 className="font-display text-xl font-semibold text-foreground border-b border-border pb-2">
                  {categoryLabels[category] || category}
                </h3>
                <div className="space-y-3">
                  {categoryIdeas.map((idea) => (
                    <div
                      key={idea.id}
                      className="idea-card group flex items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <p className="text-foreground leading-relaxed">{idea.content}</p>
                        {idea.tags && idea.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {idea.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(idea.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyIdea(idea.id, idea.content)}
                        >
                          {copiedId === idea.id ? (
                            <Check className="h-4 w-4 text-forest" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteIdea(idea.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
