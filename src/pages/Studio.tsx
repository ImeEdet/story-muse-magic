import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Feather, Send, Square, Wand2, BookmarkPlus, Pin, X } from "lucide-react";
import { Header } from "@/components/Header";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { allVibes } from "@/lib/vibes";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const DRAFT_KEY = "storyspark-draft";
const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/story-muse`;

const quickActions = [
  { label: "Plot twists", prompt: "Suggest 4 plot twists or directions that grow naturally from where my draft is right now." },
  { label: "Character names", prompt: "Suggest 5 character names that fit the vibe of my story, each with a one-line reason." },
  { label: "Place names", prompt: "Suggest 5 place or setting names that fit my story's atmosphere, with a short sensory description each." },
  { label: "Titles", prompt: "Suggest 5 possible titles for this story or the current chapter." },
  { label: "What's next?", prompt: "I'm stuck. What could happen in the very next scene?" },
];

const shortLabel = (v: string) => v.split(" (")[0];

export default function Studio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [draft, setDraft] = useState(() => localStorage.getItem(DRAFT_KEY) ?? "");
  const [detected, setDetected] = useState<string[]>([]);
  const [pinned, setPinned] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [mood, setMood] = useState("");
  const [sensing, setSensing] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastDetected = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeVibes = Array.from(new Set([...pinned, ...detected.filter((v) => !dismissed.includes(v))]));
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token;

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, draft);
  }, [draft]);

  // Live vibe sensing: after a pause in typing, when enough new text exists
  useEffect(() => {
    if (!user || words < 25) return;
    if (Math.abs(draft.length - lastDetected.current.length) < 120 && lastDetected.current) return;
    const t = setTimeout(async () => {
      lastDetected.current = draft;
      setSensing(true);
      try {
        const { data, error } = await supabase.functions.invoke("story-muse", {
          body: { action: "detect", draftText: draft, candidates: allVibes },
        });
        if (error) throw error;
        setDetected(data.vibes ?? []);
        setMood(data.mood ?? "");
      } catch (e) {
        console.error(e);
      } finally {
        setSensing(false);
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [draft, user, words]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;
    if (!user) {
      toast({ title: "Sign in to talk with the Muse", variant: "destructive" });
      return;
    }
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const token = await getToken();
      const res = await fetch(FN_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "chat", draftText: draft, vibes: activeVibes, messages: next }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === "string" ? err.error : "The Muse couldn't respond.");
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += value;
        setMessages([...next, { role: "assistant", content: acc }]);
      }
      if (!acc) setMessages([...next, { role: "assistant", content: "_The Muse fell silent. Try asking another way._" }]);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages(next);
        toast({ title: "Muse unavailable", description: (e as Error).message, variant: "destructive" });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const saveReply = async (content: string) => {
    if (!user) return;
    const { error } = await supabase.from("saved_ideas").insert({
      content, category: "plot", tags: activeVibes, user_id: user.id,
    });
    toast(error ? { title: "Save failed", variant: "destructive" } : { title: "Saved to your notebook" });
  };

  const togglePin = (v: string) =>
    setPinned((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      <Header />
      <main className="relative z-10 flex-1 container mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 sm:gap-6">
        {/* Canvas */}
        <section className="category-section flex flex-col min-h-[60vh]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Feather className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-semibold text-foreground">The Writing Desk</h2>
            </div>
            <span className="text-xs text-muted-foreground">{words.toLocaleString()} words · saved on this device</span>
          </div>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Begin your story here... As you write, the Muse will sense its mood."
            className="flex-1 min-h-[50vh] resize-none font-serif text-base sm:text-lg leading-loose bg-transparent border-none focus-visible:ring-0 shadow-none p-1"
          />
          <div className="pt-3 border-t border-border mt-3">
            <FileUpload onTextExtracted={setDraft} />
          </div>
        </section>

        {/* Muse */}
        <aside className="category-section flex flex-col lg:h-[calc(100vh-7rem)] lg:sticky lg:top-20">
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" /> The Muse
              </h3>
              {sensing && <span className="text-xs text-muted-foreground animate-pulse">sensing the mood…</span>}
            </div>
            <p className="text-xs text-muted-foreground italic mt-1 min-h-[1rem]">
              {mood || (user ? "Write a few lines and I'll read the atmosphere." : "Sign in to awaken the Muse.")}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {activeVibes.map((v) => (
                <span key={v} className="vibe-tag vibe-tag-selected animate-fade-in inline-flex items-center gap-1 !text-xs !py-1">
                  <button onClick={() => togglePin(v)} title={pinned.includes(v) ? "Unpin" : "Pin this vibe"}>
                    <Pin className={cn("h-3 w-3", pinned.includes(v) ? "fill-current" : "opacity-50")} />
                  </button>
                  {shortLabel(v)}
                  <button
                    onClick={() => { setPinned((p) => p.filter((x) => x !== v)); setDismissed((d) => [...d, v]); }}
                    title="Not this vibe"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[50vh] lg:max-h-none pr-1">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6 font-serif">
                Ask me anything about your story, or pick a spark below.
              </p>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-8 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm">{m.content}</div>
              ) : (
                <div key={i} className="group text-sm text-foreground font-serif leading-relaxed prose-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_strong]:text-primary">
                  {m.content ? <ReactMarkdown>{m.content}</ReactMarkdown> : <span className="animate-pulse text-muted-foreground">The Muse is thinking…</span>}
                  {m.content && !(streaming && i === messages.length - 1) && (
                    <button onClick={() => saveReply(m.content)} className="opacity-60 hover:opacity-100 text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <BookmarkPlus className="h-3 w-3" /> Save to notebook
                    </button>
                  )}
                </div>
              )
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 my-3">
            {quickActions.map((a) => (
              <button key={a.label} onClick={() => send(a.prompt)} disabled={streaming}
                className="vibe-tag vibe-tag-unselected !text-xs !py-1 disabled:opacity-50">
                {a.label}
              </button>
            ))}
          </div>

          {user ? (
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask the Muse…"
                rows={2}
                className="resize-none text-sm"
              />
              {streaming ? (
                <Button type="button" size="icon" variant="secondary" onClick={() => abortRef.current?.abort()} aria-label="Stop">
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </form>
          ) : (
            <Link to="/auth"><Button className="w-full">Sign in to talk with the Muse</Button></Link>
          )}
        </aside>
      </main>
    </div>
  );
}
