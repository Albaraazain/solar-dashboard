-- Historical quote version tracking
CREATE TABLE quote_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    calculations JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_versions_quote_id ON quote_versions(quote_id);

-- Versioning trigger function
CREATE OR REPLACE FUNCTION save_quote_version()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO quote_versions (quote_id, calculations)
    VALUES (NEW.id, NEW.calculations);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to quotes table
CREATE TRIGGER quote_versioning 
AFTER UPDATE ON quotes
FOR EACH ROW
WHEN (OLD.calculations::text IS DISTINCT FROM NEW.calculations::text)
EXECUTE FUNCTION save_quote_version();
