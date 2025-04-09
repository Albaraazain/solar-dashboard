-- Disable triggers temporarily for the seeding process
ALTER TABLE public.panels DISABLE TRIGGER ALL;
ALTER TABLE public.inverters DISABLE TRIGGER ALL;
ALTER TABLE public.structure_types DISABLE TRIGGER ALL;
ALTER TABLE public.variable_costs DISABLE TRIGGER ALL;
ALTER TABLE public.bracket_costs DISABLE TRIGGER ALL;

DO $$ 
DECLARE
    error_text text;
BEGIN
    -- Clear existing data
    TRUNCATE public.panels, public.inverters, public.structure_types, public.variable_costs, public.bracket_costs CASCADE;

    -- Panels data
    BEGIN
        INSERT INTO public.panels (brand, price, power, default_choice, availability) VALUES
        ('Longhi', 400, 545, false, true),
        ('Canada Solar', 575, 800, true, true),
        ('Longi', 345, 450, false, true);
        RAISE NOTICE 'Panels data inserted successfully';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_text = MESSAGE_TEXT;
        RAISE NOTICE 'Error inserting panels data: %', error_text;
    END;

    -- Structure Types data
    BEGIN
        INSERT INTO public.structure_types (l2, abs_cost, custom_cost) VALUES
        (true, 500, 116);
        RAISE NOTICE 'Structure Types data inserted successfully';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_text = MESSAGE_TEXT;
        RAISE NOTICE 'Error inserting structure types data: %', error_text;
    END;

    -- Variable Costs data
    BEGIN
        INSERT INTO public.variable_costs (cost_name, cost) VALUES
        ('Frame Cost per Watt', 16),
        ('Installation Cost per Watt', 8.2),
        ('Net Metering', 260000),
        ('Labor Cost', 9),
        ('Transport Cost', 210),
        ('DC Wire Roll', 21000),
        ('AC Cable', 13100),
        ('Accessories', 26000);
        RAISE NOTICE 'Variable Costs data inserted successfully';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_text = MESSAGE_TEXT;
        RAISE NOTICE 'Error inserting variable costs data: %', error_text;
    END;

    -- Bracket Costs data
    BEGIN
        INSERT INTO public.bracket_costs (min_size, max_size, ac_cable, accessories, dc_cable) VALUES
        (10, 999, 10000, 20000, 15000);
        RAISE NOTICE 'Bracket Costs data inserted successfully';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_text = MESSAGE_TEXT;
        RAISE NOTICE 'Error inserting bracket costs data: %', error_text;
    END;

    -- Inverters data
    BEGIN
        INSERT INTO public.inverters (brand, price, power, availability) VALUES
        ('Maxpower', 200000, 10, true),
        ('Maxpower', 100000, 5, true),
        ('MaxPower', 170000, 8, true),
        ('MaxPower', 250000, 15, true);
        RAISE NOTICE 'Inverters data inserted successfully';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_text = MESSAGE_TEXT;
        RAISE NOTICE 'Error inserting inverters data: %', error_text;
    END;
END $$;

-- Re-enable triggers
ALTER TABLE public.panels ENABLE TRIGGER ALL;
ALTER TABLE public.inverters ENABLE TRIGGER ALL;
ALTER TABLE public.structure_types ENABLE TRIGGER ALL;
ALTER TABLE public.variable_costs ENABLE TRIGGER ALL;
ALTER TABLE public.bracket_costs ENABLE TRIGGER ALL;
