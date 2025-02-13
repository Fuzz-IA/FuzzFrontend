-- Add game_id column to prompt_submissions table
ALTER TABLE prompt_submissions 
ADD COLUMN game_id bigint;

-- Update existing rows to set game_id based on prompt_id
UPDATE prompt_submissions 
SET game_id = FLOOR(prompt_id / 100000);

-- Make game_id not null after populating data
ALTER TABLE prompt_submissions 
ALTER COLUMN game_id SET NOT NULL;

-- Add an index on game_id for better query performance
CREATE INDEX idx_prompt_submissions_game_id ON prompt_submissions(game_id); 