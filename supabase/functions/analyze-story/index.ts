import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_STORY_LENGTH = 50000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { storyText, vibes } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!storyText || storyText.trim().length === 0) {
      throw new Error("Story text is required");
    }

    // Input size validation
    if (storyText.length > MAX_STORY_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Story text must be less than ${MAX_STORY_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vibeString = vibes && vibes.length > 0 
      ? `Selected vibes/genres: ${vibes.join(", ")}.` 
      : "";

    const systemPrompt = `You are StorySpark, a creative writing assistant specialized in analyzing stories and generating ideas. You help writers by providing creative suggestions that match the tone, themes, and aesthetic of their writing.

Your task is to analyze the provided story excerpt and generate suggestions in four categories. ${vibeString}

Respond ONLY with valid JSON in this exact format:
{
  "plot": ["idea 1", "idea 2", "idea 3", "idea 4", "idea 5"],
  "names": ["name 1", "name 2", "name 3", "name 4", "name 5"],
  "settings": ["setting 1", "setting 2", "setting 3", "setting 4", "setting 5"],
  "titles": ["title 1", "title 2", "title 3", "title 4", "title 5"]
}

Guidelines:
- Plot ideas: Suggest interesting plot directions, twists, or story arcs that fit the narrative
- Names: Suggest character names, place names, or object names that match the aesthetic
- Settings: Suggest locations, time periods, or atmospheric settings that enhance the story
- Titles: Suggest potential story titles or chapter names

Make each suggestion specific, evocative, and aligned with the story's existing tone and the selected vibes.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the story excerpt to analyze:\n\n${storyText}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const suggestions = JSON.parse(jsonStr.trim());

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
