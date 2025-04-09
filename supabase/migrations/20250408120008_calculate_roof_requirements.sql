-- Roof Requirements Calculation for 3D Visualization
CREATE OR REPLACE FUNCTION calculate_roof_requirements(
    system_size FLOAT,
    panel_id UUID
) RETURNS JSONB AS $$
DECLARE
    panel RECORD;
    panel_area FLOAT;
    total_area FLOAT;
BEGIN
    SELECT (specs->>'width')::FLOAT AS width, 
           (specs->>'height')::FLOAT AS height 
    INTO panel
    FROM panels 
    WHERE id = panel_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Panel not found with ID: %', panel_id;
    END IF;

    panel_area := (panel.width * panel.height) / 10000; -- Convert cm² to m²
    total_area := panel_area * CEIL((system_size * 1000) / (SELECT power FROM panels WHERE id = panel_id));

    RETURN jsonb_build_object(
        'required_area', ROUND(total_area, 1),
        'layout_efficiency', GREATEST(0.7, 0.9 - (total_area * 0.003)),
        'optimal_orientation', jsonb_build_object(
            'azimuth', 182.5,
            'tilt', CASE 
                WHEN total_area < 20 THEN 30
                ELSE 25
            END
        ),
        'shading_impact', 0.92 - (total_area * 0.0025)
    );
END;
$$ LANGUAGE plpgsql;
