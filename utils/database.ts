// utils/database.ts - Updated to use RPC functions

import { supabase } from './supabase';
import { Panel, Inverter, StructureType, BracketCost, VariableCost } from './supabase';

/**
 * Fetches all available panels from the database using RPC
 * @returns Array of Panel objects
 */
export async function fetchPanels(): Promise<Panel[]> {
  console.log('Fetching panels from database via RPC...');
  
  try {
    const { data, error } = await supabase.rpc('fetch_panels');
    
    if (error) {
      console.error('Error fetching panels via RPC:', error.message, error);
      throw new Error(`Failed to fetch panels: ${error.message}`);
    }
    
    console.log(`Successfully fetched ${data?.length || 0} panels via RPC`);
    return data as Panel[];
  } catch (err) {
    console.error('Exception in fetchPanels:', err);
    throw err;
  }
}

/**
 * Fetches all available inverters from the database using RPC
 * @returns Array of Inverter objects
 */
export async function fetchInverters(): Promise<Inverter[]> {
  console.log('Fetching inverters from database via RPC...');
  
  try {
    const { data, error } = await supabase.rpc('fetch_inverters');
    
    if (error) {
      console.error('Error fetching inverters via RPC:', error.message, error);
      throw new Error(`Failed to fetch inverters: ${error.message}`);
    }
    
    console.log(`Successfully fetched ${data?.length || 0} inverters via RPC`);
    return data as Inverter[];
  } catch (err) {
    console.error('Exception in fetchInverters:', err);
    throw err;
  }
}

/**
 * Fetches all structure types from the database using RPC
 * @returns Array of StructureType objects
 */
export async function fetchStructureTypes(): Promise<StructureType[]> {
  console.log('Fetching structure types from database via RPC...');
  
  try {
    const { data, error } = await supabase.rpc('fetch_structure_types');
    
    if (error) {
      console.error('Error fetching structure types via RPC:', error.message, error);
      throw new Error(`Failed to fetch structure types: ${error.message}`);
    }
    
    console.log(`Successfully fetched ${data?.length || 0} structure types via RPC`);
    return data as StructureType[];
  } catch (err) {
    console.error('Exception in fetchStructureTypes:', err);
    throw err;
  }
}

/**
 * Fetches all bracket costs from the database using RPC
 * @returns Array of BracketCost objects
 */
export async function fetchBracketCosts(): Promise<BracketCost[]> {
  console.log('Fetching bracket costs from database via RPC...');
  
  try {
    const { data, error } = await supabase.rpc('fetch_bracket_costs');
    
    if (error) {
      console.error('Error fetching bracket costs via RPC:', error.message, error);
      throw new Error(`Failed to fetch bracket costs: ${error.message}`);
    }
    
    console.log(`Successfully fetched ${data?.length || 0} bracket costs via RPC`);
    return data as BracketCost[];
  } catch (err) {
    console.error('Exception in fetchBracketCosts:', err);
    throw err;
  }
}

/**
 * Fetches all variable costs from the database using RPC
 * @returns Array of VariableCost objects
 */
export async function fetchVariableCosts(): Promise<VariableCost[]> {
  console.log('Fetching variable costs from database via RPC...');
  
  try {
    const { data, error } = await supabase.rpc('fetch_variable_costs');
    
    if (error) {
      console.error('Error fetching variable costs via RPC:', error.message, error);
      throw new Error(`Failed to fetch variable costs: ${error.message}`);
    }
    
    console.log(`Successfully fetched ${data?.length || 0} variable costs via RPC`);
    return data as VariableCost[];
  } catch (err) {
    console.error('Exception in fetchVariableCosts:', err);
    throw err;
  }
}

/**
 * Gets bracket costs for a specific system size using RPC
 * @param size System size in kW
 * @returns BracketCost object that matches the system size
 */
export async function getBracketCostsForSize(size: number): Promise<BracketCost | null> {
  console.log(`Fetching bracket costs for ${size}kW system via RPC...`);
  
  try {
    const { data, error } = await supabase.rpc('get_bracket_costs_for_size', { p_size: size });
    
    if (error) {
      console.error('Error fetching bracket costs for size via RPC:', error.message, error);
      throw new Error(`Failed to fetch bracket costs for size: ${error.message}`);
    }
    
    console.log(`Successfully fetched bracket costs for ${size}kW system via RPC:`, data);
    return data as BracketCost;
  } catch (err) {
    console.error(`Exception in getBracketCostsForSize(${size}):`, err);
    throw err;
  }
}

/**
 * Fallback to direct table access if RPC isn't working
 * @returns Array of Panel objects
 */
export async function fetchPanelsFallback(): Promise<Panel[]> {
  console.log('Falling back to direct panel fetch...');
  
  try {
    const { data, error } = await supabase
      .from('panels')
      .select('*')
      .eq('availability', true)
      .order('power', { ascending: true });
    
    if (error) {
      console.error('Error in fallback panel fetch:', error.message, error);
      throw new Error(`Fallback panel fetch failed: ${error.message}`);
    }
    
    console.log(`Successfully fetched ${data?.length || 0} panels via fallback`);
    return data as Panel[];
  } catch (err) {
    console.error('Exception in fetchPanelsFallback:', err);
    throw err;
  }
}

/**
 * Fetches all equipment data in parallel using RPCs
 * @returns Object containing arrays of all equipment types
 */
export async function fetchAllEquipment() {
  console.log('Fetching all equipment data via RPCs...');
  
  try {
    const [panels, inverters, structureTypes, bracketCosts, variableCosts] = await Promise.all([
      fetchPanels().catch(err => {
        console.warn('Panel RPC failed, trying fallback...', err);
        return fetchPanelsFallback().catch(() => [] as Panel[]);
      }),
      fetchInverters().catch(() => [] as Inverter[]),
      fetchStructureTypes().catch(() => [] as StructureType[]),
      fetchBracketCosts().catch(() => [] as BracketCost[]),
      fetchVariableCosts().catch(() => [] as VariableCost[])
    ]);
    
    return {
      panels,
      inverters,
      structureTypes,
      bracketCosts,
      variableCosts
    };
  } catch (err) {
    console.error('Error fetching equipment data:', err);
    throw err;
  }
}

// Default equipment data in case database fails
export const DEFAULT_EQUIPMENT = {
  panels: [
    { id: "1", brand: "JinkoSolar", power: 450, price: 45000, default_choice: true },
    { id: "2", brand: "LONGi", power: 545, price: 58000, default_choice: false },
    { id: "3", brand: "JA Solar", power: 800, price: 85000, default_choice: false }
  ],
  inverters: [
    { id: "1", brand: "Sungrow", power: 5, price: 120000 },
    { id: "2", brand: "Huawei", power: 10, price: 180000 },
    { id: "3", brand: "SMA", power: 15, price: 250000 }
  ],
  structureTypes: [
    { id: "1", l2: true, custom_cost: 8000, abs_cost: 5000 }
  ],
  bracketCosts: [
    { id: "1", min_size: 1, max_size: 5, dc_cable: 300, ac_cable: 400, accessories: 8000 }
  ],
  variableCosts: [
    { id: "1", cost_name: "installation", cost: 25000 },
    { id: "2", cost_name: "transport", cost: 15000 }
  ]
};

/**
 * Alternative function to fetch all equipment using direct table access
 * Use this if the RPC approach isn't working
 */
export async function fetchAllEquipmentDirect() {
  console.log('Fetching all equipment data directly from tables...');
  
  try {
    const panels = await supabase.from('panels').select('*').eq('availability', true);
    const inverters = await supabase.from('inverters').select('*').eq('availability', true);
    const structureTypes = await supabase.from('structure_types').select('*');
    const bracketCosts = await supabase.from('bracket_costs').select('*');
    const variableCosts = await supabase.from('variable_costs').select('*');
    
    const hasPanelError = panels.error || !panels.data?.length;
    const hasInverterError = inverters.error || !inverters.data?.length;
    const hasStructureError = structureTypes.error || !structureTypes.data?.length;
    const hasBracketError = bracketCosts.error || !bracketCosts.data?.length;
    const hasVariableCostError = variableCosts.error || !variableCosts.data?.length;
    
    console.log('Direct fetch results:', {
      panels: hasPanelError ? 'ERROR/EMPTY' : `${panels.data?.length} items`,
      inverters: hasInverterError ? 'ERROR/EMPTY' : `${inverters.data?.length} items`,
      structureTypes: hasStructureError ? 'ERROR/EMPTY' : `${structureTypes.data?.length} items`,
      bracketCosts: hasBracketError ? 'ERROR/EMPTY' : `${bracketCosts.data?.length} items`,
      variableCosts: hasVariableCostError ? 'ERROR/EMPTY' : `${variableCosts.data?.length} items`,
    });
    
    return {
      panels: hasPanelError ? [] : panels.data,
      inverters: hasInverterError ? [] : inverters.data,
      structureTypes: hasStructureError ? [] : structureTypes.data,
      bracketCosts: hasBracketError ? [] : bracketCosts.data,
      variableCosts: hasVariableCostError ? [] : variableCosts.data
    };
  } catch (err) {
    console.error('Error during direct equipment fetch:', err);
    throw err;
  }
}