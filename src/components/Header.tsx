import { Sparkles, BookMarked } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <Sparkles className="h-6 w-6 text-primary group-hover:text-spark transition-colors" />
          <h1 className="text-2xl font-display font-bold text-foreground">StorySpark</h1>
        </Link>
        
        <div className="flex items-center gap-2">
          <Link to="/notebook">
            <Button variant="ghost" size="sm" className="gap-2">
              <BookMarked className="h-4 w-4" />
              <span className="hidden sm:inline">My Notebook</span>
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
