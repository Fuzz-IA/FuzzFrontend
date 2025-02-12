-- Create a function to safely increment votes_count
CREATE OR REPLACE FUNCTION increment_votes_count(row_id bigint)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE prompt_submissions 
  SET votes_count = votes_count + 1 
  WHERE prompt_id = row_id
  RETURNING votes_count INTO new_count;
  
  RETURN new_count;
END;
$$; 