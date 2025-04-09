-- Battery Recommendation for System Summary
CREATE OR REPLACE FUNCTION calculate_battery_recommendation(
    daily_usage FLOAT,
    autonomy_days INT DEFAULT 3
) RETURNS JSONB AS $$
DECLARE
    battery RECORD;
BEGIN
    IF daily_usage < 10 OR daily_usage > 100 THEN
        RAISE EXCEPTION 'Invalid daily usage: % kWh (10-100 kWh acceptable)', daily_usage;
    END IF;

    SELECT * INTO battery
    FROM battery_options
    WHERE capacity_kwh >= daily_usage * autonomy_days
    ORDER BY capacity_kwh ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No suitable battery found for % kWh daily usage', daily_usage;
    END IF;

    RETURN jsonb_build_object(
        'recommended_capacity', battery.capacity_kwh,
        'autonomy_days', autonomy_days,
        'estimated_cost', battery.base_price * (1 + (autonomy_days * 0.05)),
        'efficiency_rating', battery.efficiency * 0.97,
        'lifespan_years', CASE
            WHEN battery.chemistry = 'LFP' THEN 15
            WHEN battery.chemistry = 'NMC' THEN 10
            ELSE 8
        END
    );
END;
$$ LANGUAGE plpgsql;
