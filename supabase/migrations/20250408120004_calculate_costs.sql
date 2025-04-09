-- Comprehensive Cost Calculation
CREATE OR REPLACE FUNCTION calculate_costs(
    system_size FLOAT, 
    panel_count INT
) RETURNS JSONB AS $$
DECLARE
    bracket RECORD;
    cost_vars JSONB;
    system_watts FLOAT := system_size * 1000;
BEGIN
    -- Get all cost variables in single query
    SELECT jsonb_object_agg(cost_name, cost) INTO cost_vars
    FROM variable_costs
    WHERE cost_name IN (
        'Net Metering',
        'Installation Cost per Watt',
        'Transport Cost',
        'Safety Certification'
    );

    -- Get appropriate cost bracket
    SELECT * INTO bracket 
    FROM bracket_costs 
    WHERE system_size BETWEEN min_size AND max_size
    ORDER BY min_size DESC
    LIMIT 1;

    RETURN jsonb_build_object(
        'components', jsonb_build_object(
            'net_metering', COALESCE((cost_vars->>'Net Metering')::FLOAT, 15000),
            'installation', COALESCE((cost_vars->>'Installation Cost per Watt')::FLOAT, 25) * system_watts,
            'dc_cable', COALESCE(bracket.dc_cable, 15000),
            'ac_cable', COALESCE(bracket.ac_cable, 10000),
            'accessories', COALESCE(bracket.accessories, 20000),
            'transport', COALESCE((cost_vars->>'Transport Cost')::FLOAT, 5000),
            'safety_cert', COALESCE((cost_vars->>'Safety Certification')::FLOAT, 7500)
        ),
        'system_size', system_size,
        'panel_count', panel_count,
        'calculation_meta', jsonb_build_object(
            'cost_bracket', bracket.bracket_name,
            'variables_used', cost_vars
        )
    );
END;
$$ LANGUAGE plpgsql;
