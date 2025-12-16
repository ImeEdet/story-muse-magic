import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Header } from "@/components/Header";
import { VibeSelector } from "@/components/VibeSelector";
import { SelectedVibesTags } from "@/components/SelectedVibesTags";
import { FileUpload } from "@/components/FileUpload";
import { ResultsSection } from "@/components/ResultsSection";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Suggestions {
  plot: string[];
  names: string[];
  settings: string[];
  titles: string[];
}

export default function Index() {
  const [storyText, setStoryText] = useState("");
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [regeneratingCategory, setRegeneratingCategory] = useState<string | null>(null);
  const [vibesOpen, setVibesOpen] = useState(true);
  const { toast } = useToast();

  const analyzeStory = async () => {
    if (!storyText.trim()) {
      toast({
        title: "No text provided",
        description: "Please paste or upload some story text to analyze",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-story", {
        body: { storyText, vibes: selectedVibes },
      });

      if (error) throw error;
      setSuggestions(data);
    } catch (error) {
      console.error("Error analyzing story:", error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Could not analyze your story. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateCategory = async (category: keyof Suggestions) => {
    if (!storyText.trim()) return;

    setRegeneratingCategory(category);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-story", {
        body: { storyText, vibes: selectedVibes },
      });

      if (error) throw error;

      setSuggestions((prev) =>
        prev ? { ...prev, [category]: data[category] } : data
      );
    } catch (error) {
      console.error("Error regenerating:", error);
      toast({
        title: "Regeneration failed",
        description: "Could not generate new ideas. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRegeneratingCategory(null);
    }
  };

  const saveIdea = async (content: string, category: string) => {
    try {
      const { error } = await supabase.from("saved_ideas").insert({
        content,
        category,
        tags: selectedVibes,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving idea:", error);
      toast({
        title: "Save failed",
        description: "Could not save to notebook. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeVibe = (vibe: string) => {
    setSelectedVibes(selectedVibes.filter((v) => v !== vibe));
  };

  return (
    <div className="min-h-screen bg-background relative">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-6xl relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-3 sm:mb-4">
            Ignite Your Story
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
            Paste your writing and let AI spark new ideas—plot twists, character names,
            settings, and titles that match your story's unique vibe.
          </p>
        </div>

        {/* Input Section */}
        <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Text Input */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Your Story Text</label>
                <span className="text-xs text-muted-foreground">
                  {storyText.length.toLocaleString()} characters
                </span>
              </div>
              <Textarea
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                placeholder="Paste your story excerpt here... The more context you provide, the better the suggestions will be."
                className="min-h-[200px] sm:min-h-[250px] resize-y font-serif text-sm sm:text-base leading-relaxed"
              />
              <FileUpload onTextExtracted={setStoryText} />
            </div>

            {/* Vibe Selector */}
            <div className="lg:col-span-1">
              <Collapsible open={vibesOpen} onOpenChange={setVibesOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between mb-3 sm:mb-4">
                    <span className="font-display font-semibold">Story Vibes</span>
                    {vibesOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-2 space-y-4">
                    <VibeSelector
                      selectedVibes={selectedVibes}
                      onVibesChange={setSelectedVibes}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          {/* Selected Vibes Display */}
          <SelectedVibesTags vibes={selectedVibes} onRemove={removeVibe} />

          {/* Get Ideas Button */}
          <div className="flex justify-center pt-2">
            <Button
              onClick={analyzeStory}
              disabled={isLoading || !storyText.trim()}
              size="lg"
              className="px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-display font-semibold gap-2"
            >
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
              {isLoading ? "Analyzing..." : "Get Ideas"}
            </Button>
          </div>
        </div>

        {/* Results Section */}
        <ResultsSection
          suggestions={suggestions}
          isLoading={isLoading}
          onRegenerate={regenerateCategory}
          onSaveIdea={saveIdea}
          regeneratingCategory={regeneratingCategory}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>StorySpark — Your AI-powered writing companion</p>
        </div>
      </footer>
    </div>
  );
}
