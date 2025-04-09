// File: app/quote/page.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { calculateSystemSize } from '@/utils/supabase';
import {
  Camera,
  MapPin,
  Plus,
  Minus,
  Info,
  Sun,
  Home,
  DollarSign,
  Zap,
  ArrowRight,
  ChevronRight,
  Cloud,
  CloudSun,
  Wind,
  ThermometerSun,
  Droplets,
  RotateCcw,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { supabase, fetchBillByReference, createQuote } from "@/utils/supabase"
import { 
  fetchPanels, 
  fetchInverters, 
  fetchStructureTypes, 
  fetchBracketCosts, 
  fetchVariableCosts,
  fetchAllEquipment,
  DEFAULT_EQUIPMENT 
} from "@/utils/database" // Import the new database functions

// Equipment types
interface Panel {
  id: string;
  brand: string;
  power: number;
  price: number;
  default_choice: boolean;
}

interface Inverter {
  id: string;
  brand: string;
  power: number;
  price: number;
}

interface StructureType {
  id: string;
  l2: boolean;
  custom_cost: number;
  abs_cost: number;
}

interface BracketCost {
  id: string;
  min_size: number;
  max_size: number;
  dc_cable: number;
  ac_cable: number;
  accessories: number;
}

interface VariableCost {
  id: string;
  cost_name: string;
  cost: number;
}

export default function SizingPage() {
  // Reference to track whether the component is mounted
  const isMounted = useRef(true);
  // Reference to track current calculation request
  const calculationRequestIdRef = useRef<string | null>(null);
  // Reference to track if equipment fetch was attempted
  const equipmentFetchAttemptedRef = useRef(false);
  
  // Basic state
  const [activeTab, setActiveTab] = useState("Sizing")
  const [selectedPanelType, setSelectedPanelType] = useState("")
  const [selectedInverterType, setSelectedInverterType] = useState("")
  const [systemSize, setSystemSize] = useState(7.5) // Default system size
  const [recommendedSystemSize, setRecommendedSystemSize] = useState<number | null>(null)
  const [panels, setPanels] = useState<Panel[]>([])
  const [inverters, setInverters] = useState<Inverter[]>([])
  const [structureTypes, setStructureTypes] = useState<StructureType[]>([])
  const [bracketCosts, setBracketCosts] = useState<BracketCost[]>([])
  const [variableCosts, setVariableCosts] = useState<VariableCost[]>([])
  
  // Quote-related state
  const [quoteTotal, setQuoteTotal] = useState<number | null>(null)
  const [quoteBreakdown, setQuoteBreakdown] = useState<{ [key: string]: number }>({})
  const [savingQuote, setSavingQuote] = useState(false)
  const [quoteSaved, setQuoteSaved] = useState(false)
  
  // Bill and calculation related state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [monthlyUsage, setMonthlyUsage] = useState<number | null>(null)
  const [billReference, setBillReference] = useState<string | null>(null)
  const [billId, setBillId] = useState<string | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculationError, setCalculationError] = useState<string | null>(null)
  const [systemSizing, setSystemSizing] = useState<any>(null)
  
  // Control flags
  const [isManualAdjustment, setIsManualAdjustment] = useState(false)
  const [isInitialCalculationComplete, setIsInitialCalculationComplete] = useState(false)
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false)
  
  // System detail states
  const [weatherData, setWeatherData] = useState<{
    sunHours: number
    efficiency: number
    temperatureImpact: number
    annualProduction: number
  } | null>(null)
  const [roofRequirements, setRoofRequirements] = useState<{
    area: number
    efficiency: number
    orientation: string
    shading: number
  } | null>(null)
  const [batteryRecommendation, setBatteryRecommendation] = useState<{
    recommended_capacity: number
    autonomy_days: number
    estimated_cost: number
    efficiency_rating: number
    lifespan_years: number
  } | null>(null)

  // Get the selected panel and inverter data
  const selectedPanel = panels.find((panel) => panel.id === selectedPanelType) || panels[0]
  const selectedInverter = inverters.find((inverter) => inverter.id === selectedInverterType) || inverters[0]
  const selectedStructureType = structureTypes[0] // Default to first structure type

  // Calculate system size based on edge function
  const fetchSystemSizing = async (forceSize?: number) => {
    if (!isMounted.current) return;
    if (!monthlyUsage) {
      console.log('Monthly usage is missing or invalid:', monthlyUsage);
      return;
    }

    // Generate a unique ID for this calculation request
    const requestId = Date.now().toString();
    calculationRequestIdRef.current = requestId;
    
    console.log(`[${requestId}] Starting system sizing calculation:`, 
      {usage: monthlyUsage, forceSize, isManual: isManualAdjustment});
    
    setIsCalculating(true);
    setCalculationError(null);

    try {
      const data = await calculateSystemSize({
        monthlyUsage,
        location: 'Lahore',
        roofDirection: 'south',
        roofType: 'standard',
        shading: 'minimal',
        ...(forceSize ? { forceSize } : {})
      });

      // Check if this is still the most recent request
      if (!isMounted.current || requestId !== calculationRequestIdRef.current) {
        console.log(`[${requestId}] Calculation completed but ignored (newer calculation in progress)`);
        return;
      }

      console.log(`[${requestId}] System sizing calculation completed:`, data);
      setSystemSizing(data);
      
      // Store the recommended system size if not already set
      if (recommendedSystemSize === null) {
        console.log(`[${requestId}] Setting recommended system size to:`, data.systemSize);
        setRecommendedSystemSize(data.systemSize);
      }
      
      // Update system size based on clear rules
      if (forceSize !== undefined) {
        console.log(`[${requestId}] Setting system size to forced value:`, forceSize);
        setSystemSize(forceSize);
      } else if (!isInitialCalculationComplete && !isManualAdjustment) {
        console.log(`[${requestId}] Initial calculation - setting system size to:`, data.systemSize);
        setSystemSize(data.systemSize);
        setIsInitialCalculationComplete(true);
      } else {
        console.log(`[${requestId}] Keeping existing system size:`, systemSize);
      }

      // Update other states as needed
      setWeatherData({
        sunHours: data.weather.sunHours,
        efficiency: data.weather.efficiency,
        temperatureImpact: data.weather.temperatureImpact,
        annualProduction: data.weather.annualProduction
      });

      setRoofRequirements({
        area: data.roof.required_area,
        efficiency: data.roof.layout_efficiency,
        orientation: data.roof.optimal_orientation,
        shading: data.roof.shading_impact
      });

      setBatteryRecommendation(data.battery);

    } catch (error: any) {
      if (!isMounted.current || requestId !== calculationRequestIdRef.current) return;
      console.error(`[${requestId}] Failed to calculate system size:`, error);
      setCalculationError(error?.message || 'Failed to calculate system size');
    } finally {
      if (isMounted.current && requestId === calculationRequestIdRef.current) {
        setIsCalculating(false);
      }
    }
  };

  // Reset to recommended system size
  const resetToRecommendedSize = async () => {
    if (recommendedSystemSize === null) return;
    
    console.log(`Resetting system size from ${systemSize} to recommended ${recommendedSystemSize}`);
    setIsManualAdjustment(false);
    
    // Trigger edge function recalculation with recommended size
    try {
      setIsCalculating(true);
      await fetchSystemSizing(recommendedSystemSize);
    } catch (error: any) {
      setCalculationError(error?.message || 'Failed to update calculations');
    } finally {
      setIsCalculating(false);
    }
  };

  // Adjust system size and recalculate
  const adjustSystemSize = async (increment: boolean) => {
    const newSize = increment ? 
      Math.min(systemSize + 0.5, 15) : // Max 15kW
      Math.max(systemSize - 0.5, 1);   // Min 1kW
    
    if (newSize === systemSize) return; // No change needed
    
    console.log(`Manually adjusting system size from ${systemSize} to ${newSize}`);
    
    setIsManualAdjustment(true);
    setSystemSize(newSize);
    
    // Trigger edge function recalculation with updated size
    try {
      setIsCalculating(true);
      await fetchSystemSizing(newSize); // Pass the new size explicitly
    } catch (error: any) {
      setCalculationError(error?.message || 'Failed to update calculations');
    } finally {
      setIsCalculating(false);
    }
  };

  // Save quote to Supabase
  const saveQuote = async () => {
    console.log('Saving quote with billId:', billId, 'and quoteTotal:', quoteTotal, 'and systemSize:', systemSize);
    if (!billId || !quoteTotal) {
      setError("Cannot save quote: Missing bill data or quote calculation");
      return;
    }

    setSavingQuote(true);

    try {
      const quoteData = {
        bill_id: billId,
        system_size: systemSize,
        total_cost: quoteTotal
      };

      console.log('Quote data to be saved:', quoteData);
      const result = await createQuote(quoteData);
      console.log('Result from createQuote:', result);

      if (result) {
        setQuoteSaved(true);
        setTimeout(() => {
          if (isMounted.current) {
            setQuoteSaved(false);
          }
        }, 3000);
      } else {
        throw new Error("Failed to save quote");
      }
    } catch (err) {
      console.error('Error saving quote:', (err as Error).message);
      setError("Failed to save your quote. Please try again.");
    } finally {
      if (isMounted.current) {
        setSavingQuote(false);
      }
    }
  };

  // Fetch equipment data with retries and fallbacks
  const fetchEquipmentData = async (retryCount = 0) => {
    console.log(`Attempting to fetch equipment data (attempt ${retryCount + 1})...`);
    
    try {
      // Try to fetch all equipment in parallel
      const { panels: fetchedPanels, inverters: fetchedInverters, 
              structureTypes: fetchedStructureTypes, 
              bracketCosts: fetchedBracketCosts, 
              variableCosts: fetchedVariableCosts } = await fetchAllEquipment();
      
      // Check if we got valid data for each type
      const hasValidPanels = fetchedPanels && fetchedPanels.length > 0;
      const hasValidInverters = fetchedInverters && fetchedInverters.length > 0;
      const hasValidStructureTypes = fetchedStructureTypes && fetchedStructureTypes.length > 0;
      const hasValidBracketCosts = fetchedBracketCosts && fetchedBracketCosts.length > 0;
      const hasValidVariableCosts = fetchedVariableCosts && fetchedVariableCosts.length > 0;
      
      // Use fetched data or fallbacks
      if (hasValidPanels) {
        console.log(`Setting ${fetchedPanels.length} panels from database`);
        setPanels(fetchedPanels);
      } else {
        console.warn('No panels found in database, using defaults');
        setPanels(DEFAULT_EQUIPMENT.panels);
      }
      
      if (hasValidInverters) {
        console.log(`Setting ${fetchedInverters.length} inverters from database`);
        setInverters(fetchedInverters);
      } else {
        console.warn('No inverters found in database, using defaults');
        setInverters(DEFAULT_EQUIPMENT.inverters);
      }
      
      if (hasValidStructureTypes) {
        console.log(`Setting ${fetchedStructureTypes.length} structure types from database`);
        setStructureTypes(fetchedStructureTypes);
      } else {
        console.warn('No structure types found in database, using defaults');
        setStructureTypes(DEFAULT_EQUIPMENT.structureTypes);
      }
      
      if (hasValidBracketCosts) {
        console.log(`Setting ${fetchedBracketCosts.length} bracket costs from database`);
        setBracketCosts(fetchedBracketCosts);
      } else {
        console.warn('No bracket costs found in database, using defaults');
        setBracketCosts(DEFAULT_EQUIPMENT.bracketCosts);
      }
      
      if (hasValidVariableCosts) {
        console.log(`Setting ${fetchedVariableCosts.length} variable costs from database`);
        setVariableCosts(fetchedVariableCosts);
      } else {
        console.warn('No variable costs found in database, using defaults');
        setVariableCosts(DEFAULT_EQUIPMENT.variableCosts);
      }
      
      // Set default selections
      const defaultPanel = hasValidPanels ? 
        fetchedPanels.find(p => p.default_choice) || fetchedPanels[0] : 
        DEFAULT_EQUIPMENT.panels[0];
      
      setSelectedPanelType(defaultPanel.id);
      
      return true;
    } catch (err) {
      console.error('Error fetching equipment data:', err);
      
      // Retry logic for transient errors
      if (retryCount < 2) {
        console.log(`Retrying equipment fetch (attempt ${retryCount + 2})...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return fetchEquipmentData(retryCount + 1);
      }
      
      // If all retries fail, use defaults
      console.warn('All equipment fetch attempts failed, using defaults');
      setPanels(DEFAULT_EQUIPMENT.panels);
      setInverters(DEFAULT_EQUIPMENT.inverters);
      setStructureTypes(DEFAULT_EQUIPMENT.structureTypes);
      setBracketCosts(DEFAULT_EQUIPMENT.bracketCosts);
      setVariableCosts(DEFAULT_EQUIPMENT.variableCosts);
      
      // Set default selections
      setSelectedPanelType(DEFAULT_EQUIPMENT.panels[0].id);
      
      setFetchError('Could not fetch equipment data from database. Using default values.');
      return false;
    }
  };

  // Fetch bill data from database
  const fetchBillData = async () => {
    console.log('Fetching bill data...');
    const storedBillRef = localStorage.getItem('billReference');
    
    if (!storedBillRef) {
      console.log('No bill reference found in localStorage');
      return null;
    }
    
    console.log('Fetching bill with reference:', storedBillRef);
    setBillReference(storedBillRef);
    
    try {
      const billRecord = await fetchBillByReference(storedBillRef);
      
      if (!billRecord) {
        console.warn('No bill found with reference:', storedBillRef);
        return null;
      }
      
      console.log('Successfully fetched bill data:', billRecord);
      return billRecord;
    } catch (err) {
      console.error('Error fetching bill:', err);
      return null;
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    const initializeApp = async () => {
      if (equipmentFetchAttemptedRef.current) return;
      equipmentFetchAttemptedRef.current = true;
      
      try {
        setLoading(true);
        console.log('Initializing application data...');

        // Step 1: Fetch equipment data
        const equipmentSuccess = await fetchEquipmentData();
        
        // Step 2: Fetch bill data if available
        const billRecord = await fetchBillData();
        
        if (billRecord && isMounted.current) {
          setBillId(billRecord.id);
          
          // Calculate system size from consumption
          const unitsConsumed = billRecord.units_consumed;
          const calculatedSize = Math.ceil(unitsConsumed / 120 * 10) / 10; // Round to nearest 0.1
          
          // IMPORTANT: Set size first, then usage to avoid duplicate calculations
          console.log('Setting initial system size to:', calculatedSize);
          setSystemSize(calculatedSize);
          
          // Update inverter selection based on system size
          if (inverters.length > 0) {
            const appropriateInverter = inverters.find(inv => inv.power >= calculatedSize) || inverters[0];
            console.log(`Setting inverter to ${appropriateInverter.brand} (${appropriateInverter.power}kW) for ${calculatedSize}kW system`);
            setSelectedInverterType(appropriateInverter.id);
          }
          
          // Set monthly usage last to trigger calculation
          console.log('Setting monthly usage from bill:', unitsConsumed);
          setMonthlyUsage(unitsConsumed);
        } else {
          // No bill data, use default values
          console.log('No bill data found, using default values');
          setMonthlyUsage(856);
        }
        
        setIsInitialLoadComplete(true);
      } catch (err: any) {
        console.error('Error during initialization:', err);
        if (isMounted.current) {
          setError(err.message || 'Failed to initialize application. Please try again.');
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    initializeApp();

    // Cleanup function to prevent state updates after unmount
    return () => {
      console.log('Component unmounting, cleaning up');
      isMounted.current = false;
    };
  }, []);

  // Trigger system sizing calculation when monthly usage is set and initial load is complete
  useEffect(() => {
    if (monthlyUsage && isInitialLoadComplete && !isInitialCalculationComplete && isMounted.current) {
      console.log('Initial calculation triggered by monthlyUsage:', monthlyUsage);
      fetchSystemSizing();
    }
  }, [monthlyUsage, isInitialLoadComplete, isInitialCalculationComplete]);

  // Update inverter selection based on system size changes
  useEffect(() => {
    if (!inverters.length || !isMounted.current) return;
    
    const appropriateInverter = inverters.find(inv => inv.power >= systemSize) || inverters[0];
    if (appropriateInverter && appropriateInverter.id !== selectedInverterType) {
      console.log(`Updating inverter selection to ${appropriateInverter.brand} (${appropriateInverter.power}kW) for ${systemSize}kW system`);
      setSelectedInverterType(appropriateInverter.id);
    }
  }, [systemSize, inverters, isInitialCalculationComplete]);

  // Update quote data when system sizing data changes
  useEffect(() => {
    if (systemSizing?.costs && isMounted.current) {
      console.log('Updating quote breakdown based on system sizing data');
      setQuoteTotal(systemSizing.costs.total);
      setQuoteBreakdown({
        panels: systemSizing.costs.panels,
        inverter: systemSizing.costs.inverter,
        structure: systemSizing.costs.mounting,
        dcCable: systemSizing.costs.dcCable,
        acCable: systemSizing.costs.acCable,
        accessories: 0, // Included in mounting costs now
        labor: systemSizing.costs.installation,
        transport: systemSizing.costs.transport,
        total: systemSizing.costs.total
      });
    }
  }, [systemSizing]);

  // Custom scrollbar hiding styles
  const scrollbarHideStyles = `
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `;

  // Helper to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ur-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(value)
      .replace("PKR", "Rs.");
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-center text-gray-600">Loading system configuration...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <div className="text-red-500 text-center mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-center text-gray-800 mb-4">{error}</p>
          <div className="flex gap-4">
            <Link
              href="/"
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors text-center"
            >
              Go Home
            </Link>
            <button
              className="flex-1 bg-emerald-500 text-white py-2 rounded-lg hover:bg-emerald-600 transition-colors"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">
      <style jsx>{scrollbarHideStyles}</style>
      <div className="max-w-[1440px] mx-auto w-full p-4 md:p-6 relative">
        {/* Header */}
        <header className="flex justify-between items-center mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-2 rounded-lg shadow-md">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-lg">
                energy
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-emerald-600">
                  cove
                </span>
              </div>
              <div className="text-xs text-gray-500">Smart Solar Sizing System</div>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <div className="text-sm text-gray-500 hidden sm:block">
              {billReference ? `Ref: ${billReference}` : "New Quote"}
            </div>
            <Link href="/" className="h-8 w-8 bg-white rounded-full flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shadow-md border border-gray-100">
              <Home className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Database fetch error warning */}
        {fetchError && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-800 text-sm">{fetchError}</p>
              <p className="text-xs text-amber-700 mt-1">
                The quote will still work correctly with default values, but you may want to check your database connection.
              </p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="relative mb-8 md:mb-10 bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-2xl overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 md:mb-4">
                Your Perfect Solar Solution
              </h1>
              <p className="text-emerald-50 mb-6 md:mb-8 text-base md:text-lg">
                Customized system sizing based on your energy profile and location data.
              </p>
              <div className="flex gap-3 md:gap-4">
                <button
                  className={`bg-white text-emerald-700 px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 ${savingQuote ? 'opacity-70 cursor-wait' : ''} ${quoteSaved ? 'bg-emerald-200' : ''}`}
                  onClick={saveQuote}
                  disabled={savingQuote || quoteSaved}
                >
                  {quoteSaved ? "Quote Saved!" : savingQuote ? "Saving..." : "Save Quote"}
                </button>
                <Link
                  href="/bill"
                  className="bg-emerald-800/30 text-white border border-white/30 px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium backdrop-blur-sm hover:bg-emerald-800/40 transition-all"
                >
                  Back to Bill
                </Link>
              </div>
            </div>
            <div className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-emerald-700/20 rounded-full animate-pulse"></div>
              <div className="absolute inset-4 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl md:text-5xl font-bold text-white mb-1 md:mb-2">
                    {systemSize}
                    {isCalculating && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <div className="text-sm md:text-base text-emerald-100">kW System</div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-emerald-800/40 to-transparent"></div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8 md:mb-10 overflow-x-auto scrollbar-hide">
          <div className="bg-white rounded-xl flex p-1.5 shadow-lg border border-gray-100">
            {["Sizing", "Equipment", "Installation", "Monitoring"].map((tab) => (
              <button
                key={tab}
                className={`px-4 sm:px-6 py-2 sm:py-2.5 text-sm rounded-lg transition-all whitespace-nowrap ${activeTab === tab
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Section Title */}
        <div className="mb-6 md:mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Solar System Sizing</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm md:text-base">
            Our AI has analyzed your energy consumption patterns and local weather data to recommend the optimal solar
            system for your needs.
          </p>
        </div>

        {/* Calculation error display */}
        {calculationError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-800 text-sm">{calculationError}</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-xs text-red-700 underline mt-1">
                Refresh the page
              </button>
            </div>
          </div>
        )}

        {/* Quote Total Summary Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Your Solar Quote</h3>
              <p className="text-gray-600">
                {systemSize}kW system with {Math.ceil((systemSize * 1000) / (selectedPanel?.power || 1))} {selectedPanel?.brand} panels
              </p>
            </div>
            <div className="text-center md:text-right">
              <div className="text-3xl md:text-4xl font-bold text-emerald-600">
                {isCalculating ? (
                  <span className="text-emerald-400">Calculating...</span>
                ) : quoteTotal ? (
                  formatCurrency(quoteTotal)
                ) : (
                  "Calculating..."
                )}
              </div>
              <div className="text-sm text-gray-500">Estimated savings of {formatCurrency(quoteTotal ? quoteTotal * 1.5 : 0)} over 25 years</div>
            </div>
          </div>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 auto-rows-auto">
          {/* Energy Usage - 4 columns */}
          <div className="md:col-span-4 bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100 overflow-hidden relative group hover:shadow-xl transition-all h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent rounded-bl-full -mr-10 -mt-10 opacity-70"></div>
            <div className="relative">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <Zap className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="font-semibold text-gray-800">Monthly Energy Usage</div>
                </div>
                <div className="text-gray-400 group-hover:text-emerald-500 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
              <div className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 flex items-end gap-2">
                {monthlyUsage || '...'} <span className="text-lg md:text-xl text-gray-500 font-normal">kWh</span>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
                    <span className="text-sm">Peak Hours</span>
                  </div>
                  <span className="text-sm font-medium">{monthlyUsage ? Math.round(monthlyUsage * 0.42) : '...'} kWh</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-800 mr-2"></div>
                    <span className="text-sm">Off-Peak</span>
                  </div>
                  <span className="text-sm font-medium">{monthlyUsage ? Math.round(monthlyUsage * 0.58) : '...'} kWh</span>
                </div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg">
                <div className="text-sm text-emerald-700">
                  <span className="font-medium">Solar Production:</span> {systemSizing?.production?.monthly || '...'} kWh/month
                </div>
              </div>
            </div>
          </div>

          {/* Recommended System Size - 4 columns */}
          <div className="md:col-span-4 bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100 overflow-hidden relative group hover:shadow-xl transition-all h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent rounded-bl-full -mr-10 -mt-10 opacity-70"></div>
            <div className="relative">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <Sun className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="font-semibold text-gray-800">System Size</div>
                </div>
                {isManualAdjustment && recommendedSystemSize !== null && (
                  <button 
                    onClick={resetToRecommendedSize} 
                    className="text-xs text-emerald-600 flex items-center gap-1 border border-emerald-200 rounded-lg px-2 py-1 hover:bg-emerald-50 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => adjustSystemSize(false)}
                  className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={systemSize <= 1 || isCalculating}
                >
                  <Minus className="w-5 h-5 text-gray-700" />
                </button>

                <div className="text-4xl md:text-5xl font-bold text-gray-900">
                  {systemSize} <span className="text-lg md:text-xl text-gray-500 font-normal">kW</span>
                  {isCalculating && (
                    <div className="text-sm text-emerald-500 animate-pulse mt-1 text-center">
                      Calculating...
                    </div>
                  )}
                </div>

                <button
                  onClick={() => adjustSystemSize(true)}
                  className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={systemSize >= 15 || isCalculating}
                >
                  <Plus className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              <div className="space-y-4 md:space-y-5">
                <div>
                  <div className="text-xs text-gray-500 mb-1 flex justify-between">
                    <span>Minimum</span>
                    <span>Recommended</span>
                    <span>Maximum</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full mb-1 relative">
                    <div className="h-full w-[60%] bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"></div>
                    <div className="absolute top-1/2 left-[60%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-emerald-500 rounded-full shadow-md"></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      {systemSizing?.recommendedRange?.minimum?.toFixed(1) || '5.0'} kW
                    </span>
                    <span>
                      {systemSizing?.recommendedRange?.maximum?.toFixed(1) || '10.0'} kW
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm">Number of Panels</div>
                  <div className="text-sm font-medium bg-emerald-100 px-3 py-1 rounded-full text-emerald-700">
                    {Math.ceil((systemSize * 1000) / (selectedPanel?.power || 1))} panels
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm">Panel Wattage</div>
                  <div className="text-sm font-medium bg-emerald-100 px-3 py-1 rounded-full text-emerald-700">
                    {selectedPanel?.power}W
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weather & Production - 4 columns */}
          <div className="md:col-span-4 bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100 overflow-hidden relative group hover:shadow-xl transition-all h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent rounded-bl-full -mr-10 -mt-10 opacity-70"></div>
            <div className="relative">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <CloudSun className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="font-semibold text-gray-800">Weather & Production</div>
                </div>
                <div className="text-gray-400 group-hover:text-emerald-500 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>

              <div className="flex justify-between mb-4 md:mb-6">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900">
                    {systemSizing?.efficiencyFactors?.irradiance?.toFixed(1) || '...'}
                  </div>
                  <div className="text-sm text-gray-500">Irradiance</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900">
                    {systemSizing?.efficiencyFactors?.inverter || '...'}%
                  </div>
                  <div className="text-sm text-gray-500">Inverter Efficiency</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900">
                    {systemSizing?.efficiencyFactors?.temperature || '...'}%
                  </div>
                  <div className="text-sm text-gray-500">Temp Impact</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 md:mb-6">
                <div className="bg-gray-50 p-2 md:p-3 rounded-lg text-center">
                  <Cloud className="w-4 h-4 md:w-5 md:h-5 text-gray-400 mx-auto mb-1" />
                  <div className="text-xs text-gray-500">Cloud Cover</div>
                  <div className="text-xs md:text-sm font-medium">{systemSizing?.weather?.cloudCover || '10'}%</div>
                </div>
                <div className="bg-gray-50 p-2 md:p-3 rounded-lg text-center">
                  <ThermometerSun className="w-4 h-4 md:w-5 md:h-5 text-orange-400 mx-auto mb-1" />
                  <div className="text-xs text-gray-500">Temperature</div>
                  <div className="text-xs md:text-sm font-medium">78°F</div>
                </div>
                <div className="bg-gray-50 p-2 md:p-3 rounded-lg text-center">
                  <Wind className="w-4 h-4 md:w-5 md:h-5 text-blue-400 mx-auto mb-1" />
                  <div className="text-xs text-gray-500">Wind</div>
                  <div className="text-xs md:text-sm font-medium">5 mph</div>
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <div className="text-sm font-medium text-emerald-800 mb-2">Annual Production</div>
                <div className="text-xl md:text-2xl font-bold text-emerald-700">{systemSizing?.production?.annual || '...'} kWh</div>
                <div className="text-xs text-emerald-600 mt-1">{systemSizing?.weather?.sunHours || '...'} peak sun hours/day</div>
              </div>
            </div>
          </div>

          {/* Panel Type Selection - 6 columns */}
          <div className="md:col-span-6 bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100 overflow-hidden relative group hover:shadow-xl transition-all h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent rounded-bl-full -mr-10 -mt-10 opacity-70"></div>
            <div className="relative">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <Sun className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="font-semibold text-gray-800">Panel Type</div>
                </div>
                <div className="text-gray-400 group-hover:text-emerald-500 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-3">Select your preferred solar panel type:</div>
                <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                  <div className="flex gap-3 min-w-max pb-1">
                    {panels.map((panel) => (
                      <div
                        key={panel.id}
                        className={`flex-shrink-0 w-40 sm:w-48 p-3 md:p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedPanelType === panel.id
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-100 bg-white hover:border-emerald-200"
                          }`}
                        onClick={() => setSelectedPanelType(panel.id)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div
                            className={`text-sm font-medium ${selectedPanelType === panel.id ? "text-emerald-700" : "text-gray-800"
                              }`}
                          >
                            {panel.brand}
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPanelType === panel.id
                                ? "border-emerald-500 bg-emerald-500"
                                : "border-gray-300"
                              }`}
                          >
                            {selectedPanelType === panel.id && (
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <div className="text-xs text-gray-500">Power</div>
                            <div className="text-xs font-medium">{panel.power}W</div>
                          </div>
                          <div className="flex justify-between">
                            <div className="text-xs text-gray-500">Price</div>
                            <div className="text-xs font-medium">{formatCurrency(panel.price)}</div>
                          </div>
                          <div className="flex justify-between">
                            <div className="text-xs text-gray-500">Panels</div>
                            <div className="text-xs font-medium">{Math.ceil((systemSize * 1000) / panel.power)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg mt-1">
                    <Info className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-emerald-800 mb-1">{selectedPanel?.brand} Panels</div>
                    <div className="text-sm text-emerald-700">
                      {selectedPanel?.power}W panels will require {Math.ceil((systemSize * 1000) / (selectedPanel?.power || 1))} panels for your {systemSize}kW system.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inverter Type Selection - 6 columns */}
          <div className="md:col-span-6 bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100 overflow-hidden relative group hover:shadow-xl transition-all h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent rounded-bl-full -mr-10 -mt-10 opacity-70"></div>
            <div className="relative">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <Zap className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="font-semibold text-gray-800">Inverter Type</div>
                </div>
                <div className="text-gray-400 group-hover:text-emerald-500 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-3">Select your preferred inverter technology:</div>
                <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                  <div className="flex gap-3 min-w-max pb-1">
                    {inverters.map((inverter) => (
                      <div
                        key={inverter.id}
                        className={`flex-shrink-0 w-40 sm:w-48 p-3 md:p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedInverterType === inverter.id
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-100 bg-white hover:border-emerald-200"
                          }`}
                        onClick={() => setSelectedInverterType(inverter.id)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div
                            className={`text-sm font-medium ${selectedInverterType === inverter.id ? "text-emerald-700" : "text-gray-800"
                              }`}
                          >
                            {inverter.brand}
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedInverterType === inverter.id
                                ? "border-emerald-500 bg-emerald-500"
                                : "border-gray-300"
                              }`}
                          >
                            {selectedInverterType === inverter.id && (
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <div className="text-xs text-gray-500">Power</div>
                            <div className="text-xs font-medium">{inverter.power}kW</div>
                          </div>
                          <div className="flex justify-between">
                            <div className="text-xs text-gray-500">Price</div>
                            <div className="text-xs font-medium">{formatCurrency(inverter.price)}</div>
                          </div>
                          <div className="flex justify-between">
                            <div className="text-xs text-gray-500">Units</div>
                            <div className="text-xs font-medium">{Math.ceil(systemSize / inverter.power)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg mt-1">
                    <Info className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-emerald-800 mb-1">{selectedInverter?.brand} Inverter</div>
                    <div className="text-sm text-emerald-700">
                      {selectedInverter?.power}kW inverter{Math.ceil(systemSize / selectedInverter?.power) > 1 ? 's' : ''} - you'll need {Math.ceil(systemSize / selectedInverter?.power)} unit{Math.ceil(systemSize / selectedInverter?.power) > 1 ? 's' : ''} for your {systemSize}kW system.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3D Roof Visualization - 6 columns */}
          <div className="md:col-span-6 bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 group hover:shadow-xl transition-all h-full">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 md:p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <Home className="w-5 h-5 text-white" />
                  </div>
                  <div className="font-semibold">3D Roof Visualization</div>
                </div>
                <div className="flex gap-2">
                  <button className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                  <button className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <MapPin className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>

            <div className="relative h-[250px] md:h-[300px]">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300">
                <div className="absolute inset-0 grid grid-cols-7 grid-rows-3 gap-1 p-8 transform perspective-800 rotateX-10">
                  {Array(Math.min(21, Math.ceil((systemSize * 1000) / (selectedPanel?.power || 1))))
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        className="bg-emerald-500/60 border border-emerald-500/80 rounded-sm shadow-md transform hover:translate-z-2 hover:bg-emerald-500/80 transition-all duration-300"
                      ></div>
                    ))}
                </div>
              </div>

              {/* Controls */}
              <div className="absolute right-4 bottom-4 flex flex-col gap-2">
                <button className="bg-white p-2 rounded-lg shadow-md">
                  <Plus className="w-4 h-4 text-gray-700" />
                </button>
                <button className="bg-white p-2 rounded-lg shadow-md">
                  <Minus className="w-4 h-4 text-gray-700" />
                </button>
              </div>

              {/* Info overlay */}
              <div className="absolute left-4 bottom-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md">
                <div className="text-sm font-medium text-gray-800">South Facing</div>
                <div className="text-xs text-gray-600">30° Pitch • Minimal Shading</div>
              </div>
            </div>

            <div className="p-4 md:p-6">
              <div className="grid grid-cols-2 gap-4 mb-4 md:mb-6">
                <div className="bg-gray-50 p-3 md:p-4 rounded-xl">
                  <div className="text-sm text-gray-500 mb-1">Required Area</div>
                  <div className="text-lg md:text-xl font-medium text-gray-900">
                    {Math.round(Math.ceil((systemSize * 1000) / (selectedPanel?.power || 1)) * 1.8)} m²
                  </div>
                </div>
                <div className="bg-gray-50 p-3 md:p-4 rounded-xl">
                  <div className="text-sm text-gray-500 mb-1">Efficiency Rating</div>
                  <div className="text-lg md:text-xl font-medium text-gray-900">95%</div>
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg mt-1">
                    <Info className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-emerald-800 mb-1">Optimal Configuration</div>
                    <div className="text-sm text-emerald-700">
                      Your roof is ideal for solar installation with excellent sun exposure throughout the day.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quote Breakdown - 6 columns */}
          <div className="md:col-span-6 bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100 overflow-hidden relative group hover:shadow-xl transition-all h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent rounded-bl-full -mr-10 -mt-10 opacity-70"></div>
            <div className="relative">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="font-semibold text-gray-800">Quote Breakdown</div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Solar Panels ({Math.ceil((systemSize * 1000) / (selectedPanel?.power || 1))} x {selectedPanel?.brand})
                  </span>
                  <span className="text-sm font-medium">{formatCurrency(quoteBreakdown.panels || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Inverter ({Math.ceil(systemSize / (selectedInverter?.power || 1))} x {selectedInverter?.brand})
                  </span>
                  <span className="text-sm font-medium">{formatCurrency(quoteBreakdown.inverter || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Mounting Structure</span>
                  <span className="text-sm font-medium">{formatCurrency(quoteBreakdown.structure || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">DC Cabling</span>
                  <span className="text-sm font-medium">{formatCurrency(quoteBreakdown.dcCable || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">AC Cabling</span>
                  <span className="text-sm font-medium">{formatCurrency(quoteBreakdown.acCable || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Accessories</span>
                  <span className="text-sm font-medium">{formatCurrency(quoteBreakdown.accessories || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Labor</span>
                  <span className="text-sm font-medium">{formatCurrency(quoteBreakdown.labor || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Transport</span>
                  <span className="text-sm font-medium">{formatCurrency(quoteBreakdown.transport || 0)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-emerald-600">{formatCurrency(quoteBreakdown.total || 0)}</span>
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg mt-1">
                    <Info className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-emerald-800 mb-1">Savings & ROI</div>
                    <div className="text-sm text-emerald-700">
                      Your {systemSize}kW system will pay for itself in approximately 9.1 years and generate
                      a total return of {formatCurrency(quoteBreakdown.total ? quoteBreakdown.total * 1.5 : 0)} over 25 years.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Summary - 12 columns */}
          <div className="md:col-span-12 bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100 overflow-hidden relative group hover:shadow-xl transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent rounded-bl-full -mr-10 -mt-10 opacity-70"></div>
            <div className="relative">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <Sun className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="font-semibold text-gray-800">System Summary</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div className="flex items-start gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg mt-1">
                      <Sun className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-emerald-800 mb-1">Solar System</div>
                      <div className="text-sm text-emerald-700">
                        {systemSize} kW system with {Math.ceil((systemSize * 1000) / (selectedPanel?.power || 1))} {selectedPanel?.brand} panels ({selectedPanel?.power}W each)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div className="flex items-start gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg mt-1">
                      <Zap className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-emerald-800 mb-1">Inverter Solution</div>
                      <div className="text-sm text-emerald-700">
                        {selectedInverter?.brand} {selectedInverter?.power}kW with {" "}
                        {Math.ceil(systemSize / (selectedInverter?.power || 1))} unit{Math.ceil(systemSize / (selectedInverter?.power || 1)) > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div className="flex items-start gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg mt-1">
                      <Droplets className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                    <div className="text-sm font-medium text-emerald-800 mb-1">Battery System</div>
                    <div className="text-sm text-emerald-700">
                      {batteryRecommendation?.recommended_capacity?.toFixed(1) || '...'} kWh capacity ({batteryRecommendation?.autonomy_days || '...'} day autonomy)
                      {batteryRecommendation?.efficiency_rating && ` • ${batteryRecommendation.efficiency_rating * 100}% efficiency`}
                    </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                <button
                  className={`flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${savingQuote ? 'opacity-70 cursor-wait' : ''} ${quoteSaved ? 'bg-emerald-200' : ''}`}
                  onClick={saveQuote}
                  disabled={savingQuote || quoteSaved}
                >
                  <span className="font-medium">
                    {quoteSaved ? "Quote Saved!" : savingQuote ? "Saving..." : "Save Quote"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  href="/bill"
                  className="flex-1 bg-white border border-emerald-200 text-emerald-700 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow hover:bg-emerald-50 transform hover:-translate-y-0.5"
                >
                  <span className="font-medium">Back to Bill Analysis</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}