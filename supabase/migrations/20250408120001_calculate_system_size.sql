-- System Size Calculation
CREATE OR REPLACE FUNCTION calculate_system_size(yearly_units FLOAT)
RETURNS FLOAT AS $$
DECLARE
    PEAK_SUN_HOURS CONSTANT FLOAT := 4.5;
    PERFORMANCE_RATIO CONSTANT FLOAT := 0.75;
    daily_usage FLOAT := yearly_units / 365;
    raw_size FLOAT := daily_usage / (PEAK_SUN_HOURS * PERFORMANCE_RATIO);
BEGIN
    RETURN CEIL(raw_size * 1.5); -- 50% safety margin
END;
$$ LANGUAGE plpgsql;

-- Validation
CREATE OR REPLACE FUNCTION validate_system_size(size FLOAT) 
RETURNS VOID AS $$
BEGIN
    IF size < 1 OR size > 100 THEN
        RAISE EXCEPTION 'System size % kW out of acceptable range (1-100kW)', size;
    END IF;
END;
$$ LANGUAGE plpgsql;
