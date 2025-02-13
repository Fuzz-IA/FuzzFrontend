-- Add available column to prompt_submissions
ALTER TABLE prompt_submissions 
ADD COLUMN available boolean NOT NULL DEFAULT true;

-- Create a function to disable all prompts
CREATE OR REPLACE FUNCTION disable_all_prompts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Add this to bypass RLS
AS $$
BEGIN
  UPDATE prompt_submissions 
  SET available = false
  WHERE available = true;
END;
$$; 