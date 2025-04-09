-- Inverter Selection with Efficiency Scoring
CREATE OR REPLACE FUNCTION get_inverter_details(system_size FLOAT)
RETURNS JSONB AS $$
DECLARE
    inverter RECORD;
    required_power FLOAT := system_size * 1000;
BEGIN
    SELECT *, 
        (efficiency * 0.6 + 
        (1 / (power - required_power + 1)) * 0.3 +
        (CASE WHEN warranty_years >=5 THEN 0.1 ELSE 0 END)) AS selection_score
    INTO inverter
    FROM inverters
    WHERE power >= required_power
    AND availability = TRUE
    ORDER BY selection_score DESC, power ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No suitable inverter found for %.2f kW system', system_size
        USING HINT = 'Verify inverter inventory or adjust system parameters';
    END IF;

    RETURN jsonb_build_object(
        'brand', inverter.brand,
        'model', inverter.model,
        'rated_power', inverter.power,
        'system_requirement', required_power,
        'efficiency', inverter.efficiency,
        'warranty', inverter.warranty_years,
        'price', inverter.price,
        'margin', inverter.power - required_power
    );
END;
$$ LANGUAGE plpgsql;
