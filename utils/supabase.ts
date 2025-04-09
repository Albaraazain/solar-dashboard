// File: utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for the entire app
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hojbpcknoqdiiwclpsgz.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvamJwY2tub3FkaWl3Y2xwc2d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3ODc3MTYsImV4cCI6MjA1OTM2MzcxNn0.K1CXeQhrU8cfIw-H0MHWExaS8Lth89AERgmXuxFDo8o';

console.log(`Using ${supabaseUrl.includes('localhost') ? 'local' : 'remote'} Supabase instance: ${supabaseUrl}`);
export const supabase = createClient(supabaseUrl, supabaseAnonKey);


export async function calculateSystemSize(data: {
  monthlyUsage: number;
  location?: string;
  roofDirection?: string;
  roofType?: string;
  shading?: string;
  forceSize?: number;
}) {
  try {
    console.log('Calling system-sizing with data:', data);
    const { data: response, error } = await supabase.functions.invoke('system-sizing', {
      body: data,
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`
      }
    });

    if (error) {
      console.error('Error from system-sizing:', error);
      throw new Error(error.message || 'Failed to calculate system size');
    }

    console.log('System-sizing response:', response);
    return response;
  } catch (error) {
    console.error('Error calculating system size:', error);
    throw error;
  }
}

// Type definitions based on your database schema
export interface Panel {
  id: string;
  brand: string;
  price: number;
  power: number;
  default_choice: boolean;
  availability: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Inverter {
  id: string;
  brand: string;
  price: number;
  power: number;
  availability: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StructureType {
  id: string;
  l2: boolean;
  custom_cost: number;
  abs_cost: number;
  created_at?: string;
  updated_at?: string;
}

export interface BracketCost {
  id: string;
  min_size: number;
  max_size: number;
  dc_cable: number;
  ac_cable: number;
  accessories: number;
  created_at?: string;
  updated_at?: string;
}

export interface VariableCost {
  id: string;
  cost_name: string;
  cost: number;
  created_at?: string;
  updated_at?: string;
}

export interface Bill {
  id: string;
  reference_number: string;
  customer_name: string;
  amount: number;
  units_consumed: number;
  issue_date: string;
  due_date: string;
  customer_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  reference_number: string;
  date: string;
  created_at?: string;
  updated_at?: string;
}

export interface Quote {
  id: string;
  bill_id: string;
  system_size: number;
  total_cost: number;
  created_at?: string;
  updated_at?: string;
}

// Helper functions
export async function fetchPanels() {
  const { data, error } = await supabase
    .from('panels')
    .select('*')
    .eq('availability', true);
  
  if (error) {
    console.error('Error fetching panels:', error);
    return [];
  }
  
  return data as Panel[];
}

export async function fetchInverters() {
  const { data, error } = await supabase
    .from('inverters')
    .select('*')
    .eq('availability', true);
  
  if (error) {
    console.error('Error fetching inverters:', error);
    return [];
  }
  
  return data as Inverter[];
}

export async function fetchStructureTypes() {
  const { data, error } = await supabase
    .from('structure_types')
    .select('*');
  
  if (error) {
    console.error('Error fetching structure types:', error);
    return [];
  }
  
  return data as StructureType[];
}

export async function fetchBracketCosts() {
  const { data, error } = await supabase
    .from('bracket_costs')
    .select('*');
  
  if (error) {
    console.error('Error fetching bracket costs:', error);
    return [];
  }
  
  return data as BracketCost[];
}

export async function fetchVariableCosts() {
  const { data, error } = await supabase
    .from('variable_costs')
    .select('*');
  
  if (error) {
    console.error('Error fetching variable costs:', error);
    return [];
  }
  
  return data as VariableCost[];
}

export async function fetchBillByReference(referenceNumber: string) {
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('reference_number', referenceNumber)
    .single();
  
  if (error) {
    console.error('Error fetching bill:', error);
    return null;
  }
  
  return data as Bill;
}

export async function createCustomer(customerData: Partial<Customer>) {
  const { data, error } = await supabase
    .from('customers')
    .upsert(customerData, { onConflict: 'reference_number' })
    .select('id')
    .single();
  
  if (error) {
    console.error('Error creating customer:', error);
    return null;
  }
  
  return data;
}

export async function createBill(billData: Partial<Bill>) {
  const { data, error } = await supabase
    .from('bills')
    .upsert(billData, { onConflict: 'reference_number' })
    .select('id')
    .single();
  
  if (error) {
    console.error('Error creating bill:', error);
    return null;
  }
  
  return data;
}

export async function createQuote(quoteData: Partial<Quote>) {
  const { data, error } = await supabase
    .from('quotes')
    .insert(quoteData)
    .select('id')
    .single();
  
  if (error) {
    console.error('Error creating quote:', error);
    return null;
  }
  
  return data;
}

// Helper function to generate mock bill data for testing
export function generateMockBillData(referenceNumber: string, phoneNumber: string) {
  const amount = Math.floor(Math.random() * 10000) + 5000; // Random amount between 5000-15000
  const unitsConsumed = Math.floor(Math.random() * 600) + 200; // Random units between 200-800
  
  // Generate monthly units for the last 6 months
  const months = ["January", "February", "March", "April", "May", "June"];
  const monthlyUnits: { [key: string]: number } = {};
  
  months.forEach(month => {
    monthlyUnits[month] = Math.floor(Math.random() * 300) + 200;
  });
  
  return {
    customerName: "Sample Customer",
    amount: amount.toString(),
    unitsConsumed: unitsConsumed.toString(),
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
    monthlyUnits,
    referenceNumber,
    address: "123 Sample Street, Islamabad",
    phoneNumber
  };
}
