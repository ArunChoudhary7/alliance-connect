-- FIX COMMENT RLS POLICIES
-- Allow authors and admins to delete comments

-- Table: public.comments
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;
DROP POLICY IF EXISTS "Post owners can delete comments on their posts" ON public.comments;

CREATE POLICY "Users can delete their own comments" 
ON public.comments FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any comment" 
ON public.comments FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'developer')
  )
);

CREATE POLICY "Post owners can delete comments on their posts" 
ON public.comments FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = public.comments.post_id 
    AND posts.user_id = auth.uid()
  )
);

-- Table: public.confession_comments
DROP POLICY IF EXISTS "Users can delete their own confession comments" ON public.confession_comments;
DROP POLICY IF EXISTS "Admins can delete confession comments" ON public.confession_comments;

CREATE POLICY "Users can delete their own confession comments" 
ON public.confession_comments FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete confession comments" 
ON public.confession_comments FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'developer')
  )
);
