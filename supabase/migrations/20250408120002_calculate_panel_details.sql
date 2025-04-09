-- Panel Calculation with enhanced error handling
CREATE OR REPLACE FUNCTION calculate_panel_details(system_size FLOAT)
RETURNS JSONB AS $$
DECLARE
    panel RECORD;
    required_power FLOAT := system_size * 1000;
BEGIN
    SELECT * INTO panel 
    FROM panels 
    WHERE availability = TRUE
    ORDER BY default_choice DESC, power ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No available panels found for system size % kW', system_size
        USING HINT = 'Check panel inventory or system size parameters';
    END IF;

    RETURN jsonb_build_object(
        'brand', panel.brand,
        'model', panel.model,
        'count', CEIL(required_power / panel.power),
        'unit_power', panel.power,
        'total_power', CEIL(required_power / panel.power) * panel.power,
        'unit_price', panel.price,
        'total_price', CEIL(required_power / panel.power) * panel.price,
        'efficiency', panel.efficiency
    );
END;
$$ LANGUAGE plpgsql;
