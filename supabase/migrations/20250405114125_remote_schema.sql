

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."document_type" AS ENUM (
    'quote',
    'agreement',
    'invoice',
    'report'
);


ALTER TYPE "public"."document_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_user_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE
    AS $$
begin
  return auth.uid();
end;
$$;


ALTER FUNCTION "public"."auth_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_quote_total"("p_system_size" numeric, "p_panel_id" "uuid", "p_inverter_id" "uuid", "p_structure_type_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
declare
  panel_cost decimal;
  inverter_cost decimal;
  structure_cost decimal;
  bracket_costs record;
  total decimal;
begin
  -- Get panel cost
  select price * ceil(p_system_size * 1000 / power)
  into panel_cost
  from panels
  where id = p_panel_id;

  -- Get inverter cost
  select price * ceil(p_system_size / power)
  into inverter_cost
  from inverters
  where id = p_inverter_id;

  -- Get structure cost
  select 
    case when l2 then custom_cost else abs_cost end * p_system_size
  into structure_cost
  from structure_types
  where id = p_structure_type_id;

  -- Get bracket costs
  select dc_cable, ac_cable, accessories
  into bracket_costs
  from bracket_costs
  where p_system_size between min_size and max_size;

  -- Calculate total
  total := panel_cost + inverter_cost + structure_cost +
           bracket_costs.dc_cable + bracket_costs.ac_cable + bracket_costs.accessories;

  return total;
end;
$$;


ALTER FUNCTION "public"."calculate_quote_total"("p_system_size" numeric, "p_panel_id" "uuid", "p_inverter_id" "uuid", "p_structure_type_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_unique_reference"("ref" character varying, "base_ref" character varying) RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
declare
    counter integer := 1;
    new_ref varchar;
begin
    new_ref := base_ref;
    while exists (
        select 1 
        from customers 
        where reference_number = new_ref
        union
        select 1
        from bills
        where reference_number = new_ref
    ) loop
        new_ref := base_ref || '_' || counter;
        counter := counter + 1;
    end loop;
    return new_ref;
end;
$$;


ALTER FUNCTION "public"."ensure_unique_reference"("ref" character varying, "base_ref" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_reference_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  year text;
  month text;
  sequence_number text;
begin
  year := to_char(current_date, 'YY');
  month := to_char(current_date, 'MM');
  
  -- Get the next sequence number for this month
  with sequence as (
    select count(*) + 1 as next_seq
    from customers
    where extract(year from created_at) = extract(year from current_date)
    and extract(month from created_at) = extract(month from current_date)
  )
  select lpad(next_seq::text, 4, '0')
  into sequence_number
  from sequence;
  
  -- Format: YYMM####
  new.reference_number := year || month || sequence_number;
  return new;
end;
$$;


ALTER FUNCTION "public"."generate_reference_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_soft_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update documents
  set deleted_at = now()
  where id = old.id;
  return null;
end;
$$;


ALTER FUNCTION "public"."handle_soft_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_timestamps"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if (tg_op = 'INSERT') then
    new.created_at = timezone('utc'::text, now());
  end if;
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_timestamps"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return (
    select count(*) = 1
    from auth.users u
    inner join auth.roles r on u.role = r.id
    where auth.uid() = u.id and r.name = 'service_role'
  );
end;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_bill_data"("p_reference_number" character varying, "p_customer_name" character varying, "p_amount" numeric, "p_units_consumed" integer, "p_issue_date" "date", "p_due_date" "date", "p_customer_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
    new_bill_id uuid;
    unique_ref varchar;
begin
    -- Ensure unique reference number
    unique_ref := ensure_unique_reference(p_reference_number, p_reference_number);
    
    -- Insert bill and return new UUID
    insert into bills (
        reference_number,
        customer_name,
        amount,
        units_consumed,
        issue_date,
        due_date,
        customer_id
    ) values (
        unique_ref,
        p_customer_name,
        p_amount,
        p_units_consumed,
        p_issue_date,
        p_due_date,
        p_customer_id
    ) returning id into new_bill_id;
    
    return new_bill_id;
end;
$$;


ALTER FUNCTION "public"."migrate_bill_data"("p_reference_number" character varying, "p_customer_name" character varying, "p_amount" numeric, "p_units_consumed" integer, "p_issue_date" "date", "p_due_date" "date", "p_customer_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."migrate_bill_data"("p_reference_number" character varying, "p_customer_name" character varying, "p_amount" numeric, "p_units_consumed" integer, "p_issue_date" "date", "p_due_date" "date", "p_customer_id" "uuid") IS 'Helper function to migrate bill data from Django to Supabase';



CREATE OR REPLACE FUNCTION "public"."migrate_customer_data"("p_old_id" integer, "p_name" character varying, "p_phone" character varying, "p_address" "text", "p_reference_number" character varying, "p_date" timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
    new_customer_id uuid;
    unique_ref varchar;
begin
    -- Ensure unique reference number
    unique_ref := ensure_unique_reference(p_reference_number, p_reference_number);
    
    -- Insert customer and return new UUID
    insert into customers (
        name,
        phone,
        address,
        reference_number,
        date
    ) values (
        p_name,
        p_phone,
        p_address,
        unique_ref,
        coalesce(p_date, now())
    ) returning id into new_customer_id;
    
    return new_customer_id;
end;
$$;


ALTER FUNCTION "public"."migrate_customer_data"("p_old_id" integer, "p_name" character varying, "p_phone" character varying, "p_address" "text", "p_reference_number" character varying, "p_date" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."migrate_customer_data"("p_old_id" integer, "p_name" character varying, "p_phone" character varying, "p_address" "text", "p_reference_number" character varying, "p_date" timestamp with time zone) IS 'Helper function to migrate customer data from Django to Supabase';



CREATE OR REPLACE FUNCTION "public"."migrate_document_data"("p_name" character varying, "p_type" character varying, "p_path" character varying, "p_url" character varying, "p_size" integer, "p_reference_number" character varying, "p_metadata" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
    new_document_id uuid;
begin
    -- Insert document and return new UUID
    insert into documents (
        name,
        type,
        path,
        url,
        size,
        reference_number,
        metadata
    ) values (
        p_name,
        p_type,
        p_path,
        p_url,
        p_size,
        p_reference_number,
        coalesce(p_metadata, '{}'::jsonb)
    ) returning id into new_document_id;
    
    return new_document_id;
end;
$$;


ALTER FUNCTION "public"."migrate_document_data"("p_name" character varying, "p_type" character varying, "p_path" character varying, "p_url" character varying, "p_size" integer, "p_reference_number" character varying, "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."migrate_document_data"("p_name" character varying, "p_type" character varying, "p_path" character varying, "p_url" character varying, "p_size" integer, "p_reference_number" character varying, "p_metadata" "jsonb") IS 'Helper function to migrate document data from Django to Supabase';



CREATE OR REPLACE FUNCTION "public"."migrate_equipment_data"("p_table_name" character varying, "p_brand" character varying, "p_price" numeric, "p_power" numeric, "p_availability" boolean) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
    new_id uuid;
begin
    -- Handle panels or inverters
    if p_table_name = 'panels' then
        insert into panels (
            brand,
            price,
            power,
            availability
        ) values (
            p_brand,
            p_price,
            p_power,
            coalesce(p_availability, true)
        ) returning id into new_id;
    elsif p_table_name = 'inverters' then
        insert into inverters (
            brand,
            price,
            power,
            availability
        ) values (
            p_brand,
            p_price,
            p_power,
            coalesce(p_availability, true)
        ) returning id into new_id;
    end if;
    
    return new_id;
end;
$$;


ALTER FUNCTION "public"."migrate_equipment_data"("p_table_name" character varying, "p_brand" character varying, "p_price" numeric, "p_power" numeric, "p_availability" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."migrate_equipment_data"("p_table_name" character varying, "p_brand" character varying, "p_price" numeric, "p_power" numeric, "p_availability" boolean) IS 'Helper function to migrate equipment data from Django to Supabase';



CREATE OR REPLACE FUNCTION "public"."parse_django_timestamp"("ts" "text") RETURNS timestamp with time zone
    LANGUAGE "plpgsql"
    AS $_$
begin
    -- Handle common Django timestamp formats
    return case
        when ts ~ '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?(\+\d{2}:?\d{2})?$' then
            ts::timestamp with time zone
        when ts ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$' then
            ts::timestamp with time zone
        else
            null
    end;
end;
$_$;


ALTER FUNCTION "public"."parse_django_timestamp"("ts" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reference_number" character varying(100) NOT NULL,
    "customer_name" character varying(200) NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "units_consumed" integer NOT NULL,
    "issue_date" "date" NOT NULL,
    "due_date" "date" NOT NULL,
    "customer_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."bills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bracket_costs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "min_size" numeric(5,2) DEFAULT 0.00 NOT NULL,
    "max_size" numeric(5,2) DEFAULT 999.00 NOT NULL,
    "dc_cable" numeric(10,2) DEFAULT 15000.00 NOT NULL,
    "ac_cable" numeric(10,2) DEFAULT 10000.00 NOT NULL,
    "accessories" numeric(10,2) DEFAULT 20000.00 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."bracket_costs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(15) NOT NULL,
    "phone" character varying(11) NOT NULL,
    "address" "text" NOT NULL,
    "reference_number" character varying(14) NOT NULL,
    "date" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "type" character varying(50) NOT NULL,
    "path" character varying(512) NOT NULL,
    "url" character varying(512) NOT NULL,
    "size" integer DEFAULT 0,
    "reference_number" character varying(100),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "documents_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['quote'::character varying, 'agreement'::character varying, 'invoice'::character varying, 'report'::character varying])::"text"[])))
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inverters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand" character varying(100) NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "power" numeric(10,2) NOT NULL,
    "availability" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."inverters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."panels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand" character varying(100) NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "power" numeric(10,2) NOT NULL,
    "default_choice" boolean DEFAULT false,
    "availability" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."panels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bill_id" "uuid" NOT NULL,
    "system_size" numeric(5,2) NOT NULL,
    "total_cost" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."quotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."structure_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "l2" boolean DEFAULT false,
    "custom_cost" numeric(10,2) NOT NULL,
    "abs_cost" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."structure_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."variable_costs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cost_name" character varying(100) NOT NULL,
    "cost" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."variable_costs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_reference_number_key" UNIQUE ("reference_number");



ALTER TABLE ONLY "public"."bracket_costs"
    ADD CONSTRAINT "bracket_costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bracket_costs"
    ADD CONSTRAINT "bracket_costs_size_range" UNIQUE ("min_size", "max_size");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_reference_number_key" UNIQUE ("reference_number");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inverters"
    ADD CONSTRAINT "inverters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."panels"
    ADD CONSTRAINT "panels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."structure_types"
    ADD CONSTRAINT "structure_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."variable_costs"
    ADD CONSTRAINT "variable_costs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_bills_customer_id" ON "public"."bills" USING "btree" ("customer_id");



CREATE INDEX "idx_bills_reference_number" ON "public"."bills" USING "btree" ("reference_number");



CREATE INDEX "idx_customers_reference_number" ON "public"."customers" USING "btree" ("reference_number");



CREATE INDEX "idx_documents_reference_number" ON "public"."documents" USING "btree" ("reference_number");



CREATE INDEX "idx_documents_type" ON "public"."documents" USING "btree" ("type");



CREATE INDEX "idx_quotes_bill_id" ON "public"."quotes" USING "btree" ("bill_id");



CREATE OR REPLACE TRIGGER "set_timestamp_bills" BEFORE UPDATE ON "public"."bills" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_bracket_costs" BEFORE UPDATE ON "public"."bracket_costs" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_customers" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_documents" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_inverters" BEFORE UPDATE ON "public"."inverters" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_panels" BEFORE UPDATE ON "public"."panels" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_quotes" BEFORE UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_structure_types" BEFORE UPDATE ON "public"."structure_types" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_variable_costs" BEFORE UPDATE ON "public"."variable_costs" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id");



CREATE POLICY "Enable all access for admin users" ON "public"."bills" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Enable all access for admin users" ON "public"."bracket_costs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Enable all access for admin users" ON "public"."customers" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Enable all access for admin users" ON "public"."documents" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Enable all access for admin users" ON "public"."inverters" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Enable all access for admin users" ON "public"."panels" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Enable all access for admin users" ON "public"."quotes" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Enable all access for admin users" ON "public"."structure_types" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Enable all access for admin users" ON "public"."variable_costs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Enable read access for authenticated users" ON "public"."bills" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for authenticated users" ON "public"."bracket_costs" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for authenticated users" ON "public"."customers" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for authenticated users" ON "public"."documents" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for authenticated users" ON "public"."inverters" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for authenticated users" ON "public"."panels" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for authenticated users" ON "public"."quotes" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for authenticated users" ON "public"."structure_types" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for authenticated users" ON "public"."variable_costs" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."bills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bracket_costs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inverters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."panels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."structure_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."variable_costs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(character) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"("inet") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "anon";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."auth_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."auth_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_quote_total"("p_system_size" numeric, "p_panel_id" "uuid", "p_inverter_id" "uuid", "p_structure_type_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_quote_total"("p_system_size" numeric, "p_panel_id" "uuid", "p_inverter_id" "uuid", "p_structure_type_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_quote_total"("p_system_size" numeric, "p_panel_id" "uuid", "p_inverter_id" "uuid", "p_structure_type_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_unique_reference"("ref" character varying, "base_ref" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_unique_reference"("ref" character varying, "base_ref" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_unique_reference"("ref" character varying, "base_ref" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_reference_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_reference_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_reference_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_soft_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_soft_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_soft_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_timestamps"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_timestamps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_timestamps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_bill_data"("p_reference_number" character varying, "p_customer_name" character varying, "p_amount" numeric, "p_units_consumed" integer, "p_issue_date" "date", "p_due_date" "date", "p_customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_bill_data"("p_reference_number" character varying, "p_customer_name" character varying, "p_amount" numeric, "p_units_consumed" integer, "p_issue_date" "date", "p_due_date" "date", "p_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_bill_data"("p_reference_number" character varying, "p_customer_name" character varying, "p_amount" numeric, "p_units_consumed" integer, "p_issue_date" "date", "p_due_date" "date", "p_customer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_customer_data"("p_old_id" integer, "p_name" character varying, "p_phone" character varying, "p_address" "text", "p_reference_number" character varying, "p_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_customer_data"("p_old_id" integer, "p_name" character varying, "p_phone" character varying, "p_address" "text", "p_reference_number" character varying, "p_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_customer_data"("p_old_id" integer, "p_name" character varying, "p_phone" character varying, "p_address" "text", "p_reference_number" character varying, "p_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_document_data"("p_name" character varying, "p_type" character varying, "p_path" character varying, "p_url" character varying, "p_size" integer, "p_reference_number" character varying, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_document_data"("p_name" character varying, "p_type" character varying, "p_path" character varying, "p_url" character varying, "p_size" integer, "p_reference_number" character varying, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_document_data"("p_name" character varying, "p_type" character varying, "p_path" character varying, "p_url" character varying, "p_size" integer, "p_reference_number" character varying, "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_equipment_data"("p_table_name" character varying, "p_brand" character varying, "p_price" numeric, "p_power" numeric, "p_availability" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_equipment_data"("p_table_name" character varying, "p_brand" character varying, "p_price" numeric, "p_power" numeric, "p_availability" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_equipment_data"("p_table_name" character varying, "p_brand" character varying, "p_price" numeric, "p_power" numeric, "p_availability" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."parse_django_timestamp"("ts" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."parse_django_timestamp"("ts" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."parse_django_timestamp"("ts" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "service_role";


















GRANT ALL ON TABLE "public"."bills" TO "anon";
GRANT ALL ON TABLE "public"."bills" TO "authenticated";
GRANT ALL ON TABLE "public"."bills" TO "service_role";



GRANT ALL ON TABLE "public"."bracket_costs" TO "anon";
GRANT ALL ON TABLE "public"."bracket_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."bracket_costs" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."inverters" TO "anon";
GRANT ALL ON TABLE "public"."inverters" TO "authenticated";
GRANT ALL ON TABLE "public"."inverters" TO "service_role";



GRANT ALL ON TABLE "public"."panels" TO "anon";
GRANT ALL ON TABLE "public"."panels" TO "authenticated";
GRANT ALL ON TABLE "public"."panels" TO "service_role";



GRANT ALL ON TABLE "public"."quotes" TO "anon";
GRANT ALL ON TABLE "public"."quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."quotes" TO "service_role";



GRANT ALL ON TABLE "public"."structure_types" TO "anon";
GRANT ALL ON TABLE "public"."structure_types" TO "authenticated";
GRANT ALL ON TABLE "public"."structure_types" TO "service_role";



GRANT ALL ON TABLE "public"."variable_costs" TO "anon";
GRANT ALL ON TABLE "public"."variable_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."variable_costs" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
