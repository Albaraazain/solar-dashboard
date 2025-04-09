// app/utils/api.ts

export async function calculateSystemSize(data: {
    monthlyUsage: number;
    location?: string;
    roofDirection?: string;
    roofType?: string;
    shading?: string;
  }) {
    try {
      const response = await fetch('/api/edge/system-sizing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate system size');
      }
  
      return await response.json();
    } catch (error) {
      console.error('Error calculating system size:', error);
      throw error;
    }
  }