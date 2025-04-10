-- Create a table to store message summaries
CREATE TABLE message_summaries (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  message_id TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Add index on message_id for faster lookups
CREATE INDEX message_summaries_message_id_idx ON message_summaries (message_id); 