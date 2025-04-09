-- Add nullable column first
ALTER TABLE quotes ADD COLUMN customer_email text;

-- Update existing records
UPDATE quotes SET customer_email = 'test@example.com';

-- Now make it NOT NULL
ALTER TABLE quotes ALTER COLUMN customer_email SET NOT NULL;
