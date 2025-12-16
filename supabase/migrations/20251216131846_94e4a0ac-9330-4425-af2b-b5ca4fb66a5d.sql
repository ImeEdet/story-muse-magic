-- Add user_id column to saved_ideas table
ALTER TABLE public.saved_ideas 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on saved_ideas" ON public.saved_ideas;

-- Create proper RLS policies for user-scoped access
CREATE POLICY "Users can view their own saved ideas" 
ON public.saved_ideas 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved ideas" 
ON public.saved_ideas 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved ideas" 
ON public.saved_ideas 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved ideas" 
ON public.saved_ideas 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);