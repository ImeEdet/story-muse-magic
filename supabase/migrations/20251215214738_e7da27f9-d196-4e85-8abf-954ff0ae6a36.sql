-- Create saved_ideas table for the Notebook feature
CREATE TABLE public.saved_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('plot', 'names', 'settings', 'titles')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public access since no auth required)
ALTER TABLE public.saved_ideas ENABLE ROW LEVEL SECURITY;

-- Allow all operations for public access (no auth)
CREATE POLICY "Allow all operations on saved_ideas"
ON public.saved_ideas
FOR ALL
USING (true)
WITH CHECK (true);