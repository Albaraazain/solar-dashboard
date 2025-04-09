-- Drop existing policies for tables we want to modify
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "public"."customers";
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "public"."bills";

-- Add new policies for customers table that allow authenticated users to read and insert
CREATE POLICY "Enable read for authenticated users" ON "public"."customers"
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users" ON "public"."customers"
FOR INSERT TO authenticated
WITH CHECK (true);

-- Add new policies for bills table that allow authenticated users to read and insert
CREATE POLICY "Enable read for authenticated users" ON "public"."bills"
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users" ON "public"."bills"
FOR INSERT TO authenticated
WITH CHECK (true);
