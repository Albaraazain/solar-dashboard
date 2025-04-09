// app/api/edge/lib/solar-constants.ts

export const LOCATION_IRRADIANCE = {
    "Northern Pakistan": 4.8,
    "Central Pakistan": 5.3, 
    "Southern Pakistan": 5.7,
    "Islamabad": 5.3,
    "Lahore": 5.2,
    "Karachi": 5.6,
    "Peshawar": 5.4,
    "Quetta": 5.8
  };
  
  export const DIRECTION_EFFICIENCY = {
    "south": 1.00,
    "southeast": 0.96,
    "southwest": 0.96,
    "east": 0.88,
    "west": 0.88,
    "north": 0.75,
    "northeast": 0.78,
    "northwest": 0.78
  };
  
  export const ROOF_TYPE_EFFICIENCY = {
    "flat": 0.90,     // 0-10° pitch
    "standard": 0.96, // 10-30° pitch - typical for Pakistan
    "steep": 0.93,    // 30-45° pitch
    "optimal": 1.00   // 25-30° pitch for Pakistan latitudes
  };
  
  export const SHADING_FACTOR = {
    "none": 1.00,        // No shading
    "minimal": 0.95,     // <10% shading during peak hours
    "moderate": 0.85,    // 10-25% shading during peak hours
    "significant": 0.70  // >25% shading during peak hours
  };
  
  export const MONTHLY_VARIATION = [
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
  
  export const SYSTEM_LOSSES = {
    inverterEfficiency: 0.96,
    wiringLosses: 0.98,
    dustSoilingLosses: 0.95,
    temperatureLosses: 0.91,
    mismatchLosses: 0.97
  };
  
  export const GRID_RELIABILITY_FACTOR = 1.05;
  export const AREA_PER_PANEL = 1.8; // m²
  export const DAYS_PER_MONTH = 30.5;
  export const DAYS_PER_YEAR = 365;