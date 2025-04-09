// app/api/edge/lib/types.ts

export interface SystemSizingInput {
    monthlyUsage: number;
    location?: string;
    roofDirection?: string;
    roofType?: string;
    shading?: string;
  }
  
  export interface PanelOption {
    power: number;
    count: number;
    roofArea: number;
  }
  
  export interface SystemSizingOutput {
    systemSize: number;
    recommendedRange: {
      minimum: number;
      recommended: number;
      maximum: number;
    };
    efficiencyFactors: {
      systemEfficiency: number;
      irradiance: number;
      direction: number;
      roofType: number;
      shading: number;
      temperature: number;
      inverter: number;
    };
    equipment: {
      panelOptions: PanelOption[];
    };
    production: {
      daily: number;
      monthly: number;
      annual: number;
      byMonth: number[];
      peakSunHours: number;
    };
    consumption: {
      monthly: number;
      peak: {
        percentage: number;
        kWh: number;
        time: string;
      };
      offPeak: number;
    };
    weather: {
      sunHours: number;
      efficiency: number;
      temperatureImpact: number;
      annualProduction: number;
    };
    metadata: {
      calculationVersion: string;
      calculationDate: string;
      location: string;
      roofDirection: string;
      roofType: string;
      shading: string;
    };
  }