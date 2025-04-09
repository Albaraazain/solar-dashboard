-- Drop existing policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON "public"."customers";
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "public"."customers";
DROP POLICY IF EXISTS "Enable read for authenticated users" ON "public"."bills";
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "public"."bills";

-- Add policies for customers table that allow both anon and authenticated users
CREATE POLICY "Enable access for all users" ON "public"."customers"
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Add policies for bills table that allow both anon and authenticated users
CREATE POLICY "Enable access for all users" ON "public"."bills"
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);
