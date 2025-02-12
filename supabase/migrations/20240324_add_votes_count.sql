-- Add votes_count column to prompt_submissions table
ALTER TABLE prompt_submissions 
ADD COLUMN votes_count integer NOT NULL DEFAULT 0; 