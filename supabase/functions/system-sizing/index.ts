// supabase/functions/system-sizing/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Cost constants
const BASE_COSTS = {
  panel450W: 45000,    // Cost per panel
  panel545W: 58000,
  panel800W: 85000,
  inverter5kw: 120000, // Cost per inverter
  inverter10kw: 180000,
  inverter15kw: 250000,
  dcCablePerMeter: 300,
  acCablePerMeter: 400,
  mountingPerPanel: 8000,
  netMetering: 50000,
  installation: 25000,
  transport: 15000
};

// Constants for solar calculations
const LOCATION_IRRADIANCE = {
  "Northern Pakistan": 4.8,
  "Central Pakistan": 5.3, 
  "Southern Pakistan": 5.7,
  "Islamabad": 5.3,
  "Lahore": 5.2,
  "Karachi": 5.6,
  "Peshawar": 5.4,
  "Quetta": 5.8
};

const DIRECTION_EFFICIENCY = {
  "south": 1.00,
  "southeast": 0.96,
  "southwest": 0.96,
  "east": 0.88,
  "west": 0.88,
  "north": 0.75,
  "northeast": 0.78,
  "northwest": 0.78
};

const ROOF_TYPE_EFFICIENCY = {
  "flat": 0.90,     // 0-10° pitch
  "standard": 0.96, // 10-30° pitch - typical for Pakistan
  "steep": 0.93,    // 30-45° pitch
  "optimal": 1.00   // 25-30° pitch for Pakistan latitudes
};

const SHADING_FACTOR = {
  "none": 1.00,        // No shading
  "minimal": 0.95,     // <10% shading during peak hours
  "moderate": 0.85,    // 10-25% shading during peak hours
  "significant": 0.70  // >25% shading during peak hours
};

const SYSTEM_LOSSES = {
  inverterEfficiency: 0.96,
  wiringLosses: 0.98,
  dustSoilingLosses: 0.95,
  temperatureLosses: 0.91,
  mismatchLosses: 0.97
};

const MONTHLY_VARIATION = [
  0.85, // January  - Winter
  0.90, // February - Winter
  1.00, // March    - Spring
  1.10, // April    - Spring
  1.15, // May      - Summer
  1.15, // June     - Summer
  1.05, // July     - Monsoon
  0.95, // August   - Monsoon
  1.05, // September- Post-monsoon
  1.00, // October  - Autumn
  0.90, // November - Autumn
  0.85  // December - Winter
];

const GRID_RELIABILITY_FACTOR = 1.05;
const AREA_PER_PANEL = 1.8; // m²
const DAYS_PER_MONTH = 30.5;
const DAYS_PER_YEAR = 365;

// Define types for valid keys
type LocationType = keyof typeof LOCATION_IRRADIANCE;
type DirectionType = keyof typeof DIRECTION_EFFICIENCY;
type RoofType = keyof typeof ROOF_TYPE_EFFICIENCY;
type ShadingType = keyof typeof SHADING_FACTOR;

// Define input type with specific string literals
interface SystemSizingInput {
  monthlyUsage: number;
  location?: LocationType;
  roofDirection?: DirectionType;
  roofType?: RoofType;
  shading?: ShadingType;
  forceSize?: number;  // Optional parameter to force a specific system size
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': req.headers.get('origin') || '*'
      }
    });
  }
  
  try {
    const input: SystemSizingInput = await req.json();
    const { 
      monthlyUsage, 
      location = "Central Pakistan", 
      roofDirection = "south",
      roofType = "standard", 
      shading = "minimal" 
    } = input;

    // Validate input
    if (!monthlyUsage || isNaN(Number(monthlyUsage)) || Number(monthlyUsage) <= 0) {
      return new Response(
        JSON.stringify({ error: "Valid monthly usage in kWh is required" }),
        {
          status: 400,
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          }
        }
      );
    }

    // Convert to number to ensure calculations work properly
    const monthlyUsageNum = Number(monthlyUsage);
    
    // Get efficiency factors from constants with type assertions for default values
    const solarIrradiance = LOCATION_IRRADIANCE[location as LocationType] ?? LOCATION_IRRADIANCE["Central Pakistan"];
    const directionEfficiency = DIRECTION_EFFICIENCY[roofDirection as DirectionType] ?? DIRECTION_EFFICIENCY["south"];
    const roofEfficiency = ROOF_TYPE_EFFICIENCY[roofType as RoofType] ?? ROOF_TYPE_EFFICIENCY["standard"];
    const shadingFactor = SHADING_FACTOR[shading as ShadingType] ?? SHADING_FACTOR["minimal"];
    
    // Calculate combined system efficiency
    const systemEfficiency = 
      SYSTEM_LOSSES.inverterEfficiency * 
      SYSTEM_LOSSES.wiringLosses * 
      SYSTEM_LOSSES.dustSoilingLosses * 
      SYSTEM_LOSSES.temperatureLosses * 
      SYSTEM_LOSSES.mismatchLosses * 
      directionEfficiency * 
      roofEfficiency * 
      shadingFactor;
    
    // Calculate daily, monthly, and annual production per kW
    const dailyProductionPerKW = solarIrradiance * systemEfficiency;
    const monthlyProductionPerKW = dailyProductionPerKW * DAYS_PER_MONTH;
    const annualProductionPerKW = dailyProductionPerKW * DAYS_PER_YEAR;
    
    // Calculate or use forced system size
    let systemSize;
    if (input.forceSize !== undefined) {
      systemSize = input.forceSize;
    } else {
      systemSize = monthlyUsageNum / monthlyProductionPerKW;
      systemSize = Math.ceil(systemSize * 2) / 2;
    }
    
    // Adjust for grid reliability if not using forced size
    const adjustedSystemSize = input.forceSize !== undefined ? 
      systemSize : 
      Math.ceil(systemSize * GRID_RELIABILITY_FACTOR * 2) / 2;
    
    // Calculate panel counts based on standard sizes from your database
    const panelPowers = [450, 545, 800]; 
    const panelCounts = panelPowers.map(power => 
      Math.ceil((adjustedSystemSize * 1000) / power)
    );
    
    // Calculate roof area requirements
    const roofAreas = panelCounts.map(count => Math.round(count * AREA_PER_PANEL));
    
    // Generate production estimates
    const monthlyProduction = Math.round(adjustedSystemSize * monthlyProductionPerKW);
    const annualProduction = Math.round(adjustedSystemSize * annualProductionPerKW);
    
    // Generate monthly production profile
    const monthlyProductionProfile = MONTHLY_VARIATION.map(factor => 
      Math.round(adjustedSystemSize * monthlyProductionPerKW * factor)
    );
    
    // Calculate min and max recommended system sizes
    const minimumSystemSize = Math.max(1, Math.floor(systemSize * 0.8 * 2) / 2);
    const maximumSystemSize = Math.ceil(systemSize * 1.2 * 2) / 2;
    
    // Calculate peak usage
    const peakUsagePercent = 42; // Based on typical Pakistani usage patterns
    const peakUsage = Math.round(monthlyUsageNum * (peakUsagePercent / 100));
    const offPeakUsage = monthlyUsageNum - peakUsage;

    // Calculate costs for each panel option
    const panelOptions = panelPowers.map((power, i) => {
      const count = panelCounts[i];
      const panelCost = power === 450 ? BASE_COSTS.panel450W : 
                       power === 545 ? BASE_COSTS.panel545W :
                       BASE_COSTS.panel800W;
      return {
        power,
        count,
        roofArea: roofAreas[i],
        totalCost: count * panelCost
      };
    });

    // Calculate inverter costs
    const inverterSize = adjustedSystemSize <= 5 ? 5 : 
                        adjustedSystemSize <= 10 ? 10 : 15;
    const inverterCount = Math.ceil(adjustedSystemSize / inverterSize);
    const inverterCost = inverterSize === 5 ? BASE_COSTS.inverter5kw :
                        inverterSize === 10 ? BASE_COSTS.inverter10kw :
                        BASE_COSTS.inverter15kw;
    const totalInverterCost = inverterCount * inverterCost;

    // Calculate other costs
    const cableLength = Math.ceil(Math.sqrt(roofAreas[0]) * 4); // Estimate cable length based on roof area
    const dcCableCost = cableLength * BASE_COSTS.dcCablePerMeter;
    const acCableCost = cableLength * BASE_COSTS.acCablePerMeter;
    const mountingCost = panelCounts[0] * BASE_COSTS.mountingPerPanel;
    const installationCost = BASE_COSTS.installation;
    const netMeteringCost = BASE_COSTS.netMetering;
    const transportCost = BASE_COSTS.transport;

    // Calculate total system cost using default panel option (450W)
    const defaultPanelCost = panelOptions[0].totalCost;
    const totalCost = defaultPanelCost + 
                     totalInverterCost + 
                     dcCableCost + 
                     acCableCost + 
                     mountingCost + 
                     installationCost + 
                     netMeteringCost + 
                     transportCost;
    
    const response = {
      systemSize: adjustedSystemSize,
      recommendedRange: {
        minimum: minimumSystemSize,
        recommended: adjustedSystemSize,
        maximum: maximumSystemSize
      },
      efficiencyFactors: {
        systemEfficiency: Math.round(systemEfficiency * 100),
        irradiance: solarIrradiance,
        direction: Math.round(directionEfficiency * 100),
        roofType: Math.round(roofEfficiency * 100),
        shading: Math.round(shadingFactor * 100),
        temperature: Math.round(SYSTEM_LOSSES.temperatureLosses * 100),
        inverter: Math.round(SYSTEM_LOSSES.inverterEfficiency * 100)
      },
      equipment: {
        panelOptions,
        inverter: {
          size: inverterSize,
          count: inverterCount,
          totalCost: totalInverterCost
        }
      },
      costs: {
        panels: defaultPanelCost,
        inverter: totalInverterCost,
        dcCable: dcCableCost,
        acCable: acCableCost,
        mounting: mountingCost,
        installation: installationCost,
        netMetering: netMeteringCost,
        transport: transportCost,
        total: totalCost
      },
      roof: {
        required_area: roofAreas[0],
        layout_efficiency: roofEfficiency * 100,
        optimal_orientation: roofDirection,
        shading_impact: (1 - shadingFactor) * 100
      },
      battery: {
        recommended_capacity: monthlyUsageNum * 0.3,
        autonomy_days: 1,
        estimated_cost: monthlyUsageNum * 200,
        efficiency_rating: 0.95,
        lifespan_years: 10
      },
      production: {
        daily: Math.round(adjustedSystemSize * dailyProductionPerKW),
        monthly: monthlyProduction,
        annual: annualProduction,
        byMonth: monthlyProductionProfile,
        peakSunHours: solarIrradiance
      },
      consumption: {
        monthly: monthlyUsageNum,
        peak: {
          percentage: peakUsagePercent,
          kWh: peakUsage,
          time: "6:00 PM - 9:00 PM"
        },
        offPeak: offPeakUsage
      },
      weather: {
        sunHours: solarIrradiance,
        efficiency: Math.round(systemEfficiency * 100),
        temperatureImpact: Math.round((1 - SYSTEM_LOSSES.temperatureLosses) * 100),
        annualProduction
      },
      metadata: {
        calculationVersion: "1.0",
        calculationDate: new Date().toISOString(),
        location,
        roofDirection,
        roofType,
        shading
      }
    };
    
    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
        ...corsHeaders,
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': req.headers.get('origin') || '*'
      }
      }
    );
  } catch (error) {
    console.error('System sizing calculation error:', error);
    return new Response(
      JSON.stringify({ error: "Failed to calculate system size" }),
      { 
        status: 500, 
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': req.headers.get('origin') || '*'
      }
      }
    );
  }
});
