-- Add calculations column first
ALTER TABLE quotes ADD COLUMN calculations JSONB NOT NULL DEFAULT '{}'::JSONB;

-- This migration has been split into granular functions:
-- 20250408120001_calculate_system_size.sql
-- 20250408120002_calculate_panel_details.sql  
-- 20250408120003_get_inverter_details.sql
-- 20250408120004_calculate_costs.sql
-- 20250408120005_generate_full_quote.sql

-- Maintained validation and trigger functions below
CREATE OR REPLACE FUNCTION validate_quote_input(yearly_units FLOAT) 
RETURNS VOID AS $$
BEGIN
    IF yearly_units <= 0 THEN
        RAISE EXCEPTION 'Invalid yearly units: %', yearly_units
        USING HINT = 'Value must be greater than 0';
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_quote_costs()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE quotes
    SET cost_breakdown = calculate_costs(
        system_size, 
        (calculations->'panel'->>'count')::INT
    ),
    updated_at = NOW()
    WHERE panel_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER panel_price_update
AFTER UPDATE OF price ON panels
FOR EACH ROW EXECUTE FUNCTION update_quote_costs();
