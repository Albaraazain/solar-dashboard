-- Weather Impact Calculations for Production Card
CREATE OR REPLACE FUNCTION calculate_weather_impact(
    location_id UUID
) RETURNS JSONB AS $$
DECLARE
    weather RECORD;
BEGIN
    SELECT * INTO weather 
    FROM weather_data 
    WHERE location = location_id
    ORDER BY recorded_date DESC 
    LIMIT 1;

    RETURN jsonb_build_object(
        'sun_hours', COALESCE(weather.avg_sun_hours, 4.5),
        'efficiency_factor', COALESCE(weather.cloud_cover, 0.15) * 0.8,
        'temperature_impact', CASE 
            WHEN weather.avg_temp > 35 THEN 0.85 
            WHEN weather.avg_temp < 10 THEN 0.92 
            ELSE 0.95 
        END,
        'annual_projection', (COALESCE(weather.avg_sun_hours, 4.5) * 365 * 0.75)
    );
END;
$$ LANGUAGE plpgsql;
