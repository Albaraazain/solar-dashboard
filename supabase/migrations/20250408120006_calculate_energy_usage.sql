-- Energy Usage Calculations for Dashboard Card
CREATE OR REPLACE FUNCTION calculate_energy_details(
    monthly_units FLOAT
) RETURNS JSONB AS $$
DECLARE
    peak_split FLOAT := 0.42; -- From historical data analysis
    avg_daily_production FLOAT;
BEGIN
    PERFORM validate_energy_input(monthly_units);
    
    RETURN jsonb_build_object(
        'monthly_usage', monthly_units,
        'peak_usage', ROUND(monthly_units * peak_split, 1),
        'offpeak_usage', ROUND(monthly_units * (1 - peak_split), 1),
        'estimated_production', ROUND(monthly_units * 1.2, 1), -- 20% overproduction
        'efficiency_score', GREATEST(0.75, LEAST(0.95, (monthly_units / 1000))),
        'comparison_metrics', jsonb_build_object(
            'regional_average', monthly_units * 0.85,
            'efficient_homes', monthly_units * 0.6
        )
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_energy_input(units FLOAT) 
RETURNS VOID AS $$
BEGIN
    IF units < 100 OR units > 5000 THEN
        RAISE EXCEPTION 'Invalid monthly units: % (100-5000 kWh acceptable)', units;
    END IF;
END;
$$ LANGUAGE plpgsql;
