  // File: app/bill/page.tsx
"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  Download,
  FileText,
  Info,
  Printer,
  Search,
  Sun,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { supabase, fetchBillByReference, Bill } from "@/utils/supabase"

export default function BillsPage() {
  interface MonthlyUsage {
    month: string
    usage: number
  }

  interface AnalyticsData {
    monthlyUsage: MonthlyUsage[]
    peakUsage: {
      time: string
      percentage: number
      kWh: number
    }
    potentialSavings: {
      monthly: string
      annual: string
      percentage: number
    }
    carbonFootprint: {
      current: string
      reduction: string
    }
  }

  interface BillData {
    customerName: string
    amount: string
    unitsConsumed: string
    issueDate: string
    dueDate: string
    monthlyUnits: {
      [key: string]: string
    }
    referenceNumber?: string
    address?: string
    phoneNumber?: string
    items?: {
      description: string
      units: string
      rate: string
      amount: number
    }[]
    taxRate?: number
    taxAmount?: number
    totalAmount?: number
    ratePerUnit?: string
  }

  const defaultBillData: BillData = {
    customerName: "",
    amount: "0",
    unitsConsumed: "0",
    issueDate: "",
    dueDate: "",
    monthlyUnits: {},
    items: [],
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 0,
    ratePerUnit: "0"
  }

  const [billData, setBillData] = useState<BillData>(defaultBillData)
  const [maxUsage, setMaxUsage] = useState<number>(0)
  const [selectedBill, setSelectedBill] = useState("March 2025")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [billRecord, setBillRecord] = useState<Bill | null>(null)

  // Format functions
  const formatNumber = (value = 0, decimals = 0) => {
    return Number(value).toLocaleString("ur-PK", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  const formatCurrency = (value: string | number = 0) => {
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value
    return new Intl.NumberFormat("ur-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(numValue)
      .replace("PKR", "Rs.")
  }

  const calculatePotentialSavings = (amount: number) => {
    const monthlyReduction = amount * 0.808 // 80.8% reduction
    return {
      monthly: `Rs. ${Math.round(monthlyReduction).toLocaleString()}`,
      annual: `Rs. ${Math.round(monthlyReduction * 12).toLocaleString()}`,
      percentage: 80.8,
    }
  }

  const calculateCarbonFootprint = (units: number) => {
    const carbonPerUnit = 0.6 // kg CO2 per kWh
    const currentCarbon = units * carbonPerUnit
    return {
      current: `${Math.round(currentCarbon)} kg CO₂`,
      reduction: `${Math.round(currentCarbon * 0.8)} kg CO₂`,
    }
  }

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    monthlyUsage: [],
    peakUsage: {
      time: "6:00 PM - 9:00 PM",
      percentage: 42,
      kWh: 0,
    },
    potentialSavings: {
      monthly: "Rs. 0",
      annual: "Rs. 0",
      percentage: 80.8,
    },
    carbonFootprint: {
      current: "0 kg CO₂",
      reduction: "0 kg CO₂",
    },
  })

  // Generate bill items based on bill data
  const generateBillItems = (data: Bill) => {
    const baseRate = Math.round((data.amount * 0.8) / data.units_consumed);
    const taxRate = 17; // 17% GST
    const taxAmount = Math.round(data.amount * 0.17);
    
    const items = [];
    
    // If units consumed <= 100
    if (data.units_consumed <= 100) {
      items.push({
        description: "Electricity Units (1-100)",
        units: data.units_consumed.toString(),
        rate: baseRate.toString(),
        amount: data.units_consumed * baseRate
      });
    } else {
      // First 100 units
      items.push({
        description: "Electricity Units (1-100)",
        units: "100",
        rate: baseRate.toString(),
        amount: 100 * baseRate
      });
      
      // If units consumed <= 300
      if (data.units_consumed <= 300) {
        items.push({
          description: "Electricity Units (101-300)",
          units: (data.units_consumed - 100).toString(),
          rate: (baseRate * 1.2).toString(), // Higher rate for higher consumption
          amount: (data.units_consumed - 100) * (baseRate * 1.2)
        });
      } else {
        // Units 101-300
        items.push({
          description: "Electricity Units (101-300)",
          units: "200",
          rate: (baseRate * 1.2).toString(), // Higher rate for higher consumption
          amount: 200 * (baseRate * 1.2)
        });
        
        // Units 301+
        items.push({
          description: "Electricity Units (301+)",
          units: (data.units_consumed - 300).toString(),
          rate: (baseRate * 1.5).toString(), // Even higher rate
          amount: (data.units_consumed - 300) * (baseRate * 1.5)
        });
      }
    }
    
    // Add fixed charges
    items.push({
      description: "Fixed Charges",
      units: "1",
      rate: "150",
      amount: 150
    });
    
    // Add fuel adjustment charge
    items.push({
      description: "Fuel Price Adjustment",
      units: data.units_consumed.toString(),
      rate: "2.5",
      amount: Math.round(data.units_consumed * 2.5)
    });
    
    return {
      items,
      taxRate,
      taxAmount,
      totalAmount: Math.round(items.reduce((sum, item) => sum + item.amount, 0) + taxAmount)
    };
  }

  // Function to generate sample monthly usage data if real data is not available
  const generateMonthlyUsageData = (unitsConsumed: number) => {
    const currentMonth = new Date().getMonth();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    // Generate data for the past 6 months
    const monthlyUnits: { [key: string]: string } = {};
    const monthlyUsage: MonthlyUsage[] = [];
    
    for (let i = 0; i < 6; i++) {
      const monthIndex = (currentMonth - 5 + i + 12) % 12;
      const month = monthNames[monthIndex];
      
      // Random value around the units consumed (between 70% and 130%)
      const randomFactor = 0.7 + Math.random() * 0.6;
      const usage = Math.round(unitsConsumed * randomFactor);
      
      monthlyUnits[month] = usage.toString();
      monthlyUsage.push({
        month: month.slice(0, 3),
        usage
      });
    }
    
    return { monthlyUnits, monthlyUsage };
  }

  const fetchBillData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get reference number from localStorage
      const referenceNumber = localStorage.getItem('billReference');
      
      if (!referenceNumber) {
        throw new Error('No bill reference found. Please go back to the home page and enter your bill details.');
      }
      
      // Fetch bill data from Supabase
      const billRecord = await fetchBillByReference(referenceNumber);
      
      if (!billRecord) {
        throw new Error('Bill not found. Please try again with a valid reference number.');
      }
      
      setBillRecord(billRecord);
      
      // Get stored bill data from localStorage for additional details
      const storedData = localStorage.getItem('billData');
      
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          
          // Generate bill items if not available
          const { items, taxRate, taxAmount, totalAmount } = generateBillItems(billRecord);
          
          let monthlyUnits = parsedData.monthlyUnits;
          let monthlyUsage: MonthlyUsage[] = [];
          
          // Process monthly usage for analytics
          if (monthlyUnits && Object.keys(monthlyUnits).length > 0) {
            monthlyUsage = Object.entries(monthlyUnits).map(([month, units]) => ({
              month: month.slice(0, 3),
              usage: Number(units) || 0
            }));
          } else {
            // Generate sample monthly data if not available
            const { monthlyUnits: generatedUnits, monthlyUsage: generatedUsage } = 
              generateMonthlyUsageData(billRecord.units_consumed);
            
            monthlyUnits = generatedUnits;
            monthlyUsage = generatedUsage;
          }
          
          const maxValue = Math.max(...monthlyUsage.map(item => item.usage));
          setMaxUsage(maxValue);
          
          setBillData({
            ...parsedData,
            // Ensure we have the official data from database
            amount: billRecord.amount.toString(),
            unitsConsumed: billRecord.units_consumed.toString(),
            customerName: billRecord.customer_name,
            issueDate: billRecord.issue_date,
            dueDate: billRecord.due_date,
            referenceNumber: billRecord.reference_number,
            monthlyUnits,
            items,
            taxRate,
            taxAmount,
            totalAmount,
            ratePerUnit: Math.round(billRecord.amount / billRecord.units_consumed).toString()
          });
          
          // Update analytics
          setAnalyticsData({
            monthlyUsage,
            peakUsage: {
              time: "6:00 PM - 9:00 PM",
              percentage: 42,
              kWh: Math.round(billRecord.units_consumed * 0.42),
            },
            potentialSavings: calculatePotentialSavings(billRecord.amount),
            carbonFootprint: calculateCarbonFootprint(billRecord.units_consumed),
          });
        } catch (err) {
          console.error('Error parsing stored bill data:', err);
          throw new Error('Invalid bill data format. Please try again.');
        }
      } else {
        // If no stored data, create from the database record
        const { items, taxRate, taxAmount, totalAmount } = generateBillItems(billRecord);
        const { monthlyUnits, monthlyUsage } = generateMonthlyUsageData(billRecord.units_consumed);
        
        const maxValue = Math.max(...monthlyUsage.map(item => item.usage));
        setMaxUsage(maxValue);
        
        setBillData({
          customerName: billRecord.customer_name,
          amount: billRecord.amount.toString(),
          unitsConsumed: billRecord.units_consumed.toString(),
          issueDate: billRecord.issue_date,
          dueDate: billRecord.due_date,
          referenceNumber: billRecord.reference_number,
          address: "123 Sample Street, City", // Default address
          phoneNumber: "03000000000", // Default phone
          monthlyUnits,
          items,
          taxRate,
          taxAmount,
          totalAmount,
          ratePerUnit: Math.round(billRecord.amount / billRecord.units_consumed).toString()
        });
        
        // Update analytics
        setAnalyticsData({
          monthlyUsage,
          peakUsage: {
            time: "6:00 PM - 9:00 PM",
            percentage: 42,
            kWh: Math.round(billRecord.units_consumed * 0.42),
          },
          potentialSavings: calculatePotentialSavings(billRecord.amount),
          carbonFootprint: calculateCarbonFootprint(billRecord.units_consumed),
        });
      }
    } catch (err: any) {
      console.error('Error fetching bill data:', err);
      setError(err.message || 'An error occurred while loading your bill data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchBillData();
    
    // Animate bill preview
    const billPreview = document.querySelector(".bill-preview");
    if (billPreview) {
      billPreview.classList.add("opacity-0", "translate-y-4");
      setTimeout(() => {
        billPreview.classList.remove("opacity-0", "translate-y-4");
      }, 100);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">
        <div className="max-w-[1440px] mx-auto w-full p-4 md:p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Main content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Bill display skeleton */}
            <div className="lg:col-span-6 xl:col-span-5">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="h-16 bg-gradient-to-r from-emerald-600/50 to-emerald-700/50"></div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics skeleton */}
            <div className="lg:col-span-6 xl:col-span-7 space-y-6">
              {/* Chart skeleton */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="h-6 bg-gray-200 rounded w-48 animate-pulse mb-4"></div>
                <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
              </div>

              {/* Stats grid skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <div className="h-6 bg-gray-200 rounded w-32 animate-pulse mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                      <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">
        <div className="max-w-[1440px] mx-auto w-full p-4 md:p-6 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 max-w-md">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <FileText className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Bill Data Error</h2>
              <p className="text-gray-600">{error}</p>
            </div>
            <Link 
              href="/"
              className="w-full bg-emerald-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-emerald-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Homepage</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">
      {/* Add the custom CSS */}
      <style jsx>{`
      .bill-preview {
        transition: transform 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease;
      }
      
      .bill-preview:hover {
        transform: translateY(-2px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
        0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }
      
      /* Print styles */
      @media print {
        .bill-preview {
          box-shadow: none !important;
          transform: none !important;
        }
      
      .bill-preview-container {
        padding: 0 !important;
      }
      }
      
      /* Responsive adjustments */
      @media (max-width: 640px) {
        .bill-preview {
          padding: 1rem;
        }
      
      .bill-preview table {
        font-size: 0.75rem;
      }
      }
    `}</style>

      <div className="max-w-[1440px] mx-auto w-full p-4 md:p-6 relative">
        {/* Header with navigation */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-emerald-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-800 font-medium">Bills & Analytics</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Bills & Analytics</h1>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  className="appearance-none bg-white border border-gray-200 rounded-lg py-2 pl-4 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
                  value={selectedBill}
                  onChange={(e) => setSelectedBill(e.target.value)}
                >
                  <option>March 2025</option>
                  <option>February 2025</option>
                  <option>January 2025</option>
                  <option>December 2024</option>
                  <option>November 2024</option>
                  <option>October 2024</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
              <button className="bg-white p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Bill display (left side) */}
          <div className="lg:col-span-6 xl:col-span-5 bill-preview-container">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 md:p-6 flex justify-between items-center rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold">Electricity Bill</div>
                  <div className="text-sm text-emerald-100">{billData.issueDate}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="bg-white/20 p-2 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors"
                  onClick={() => window.print()}>
                  <Printer className="w-4 h-4 text-white" />
                </button>
                <button className="bg-white/20 p-2 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors">
                  <Download className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Bill document */}
            <div className="bill-preview bg-white rounded-b-2xl shadow-lg border border-gray-100 border-t-0 overflow-hidden transition-all duration-300">
              <div className="flex h-full w-full items-center justify-center p-3 sm:p-6">
                <div className="w-full min-h-[900px] bg-white rounded-lg p-3 sm:p-6 flex flex-col relative">
                  {/* Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                    <div className="text-9xl font-bold text-emerald-900 rotate-[-30deg]">PAID</div>
                  </div>

                  {/* Header */}
                  <div className="flex justify-between items-center mb-3 sm:mb-4 relative z-10">
                    <div className="text-xl sm:text-2xl font-bold text-gray-800">
                      energy<span className="text-emerald-600">cove</span>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Bill #{billData.referenceNumber}</div>
                  </div>

                  {/* Bill Details */}
                  <div className="space-y-4 sm:space-y-6 relative z-10">
                    {/* Customer Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                      <div>
                        <h3 className="text-sm font-semibold uppercase text-gray-700 mb-1">Bill To</h3>
                        <p className="text-sm text-gray-600">{billData.customerName}</p>
                        <p className="text-sm text-gray-600">{billData.address}</p>
                        <p className="text-sm text-gray-600">{billData.phoneNumber}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold uppercase text-gray-700 mb-1">From</h3>
                        <p className="text-sm text-gray-600">energycove Clean Energy</p>
                        <p className="text-sm text-gray-600">1 Renewable Way</p>
                        <p className="text-sm text-gray-600">Greenville, CA 94301</p>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                      <p className="text-gray-600">
                        <span className="font-medium">Issue Date:</span> {billData.issueDate}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Due Date:</span> {billData.dueDate}
                      </p>
                    </div>

                    {/* Bill Table */}
                    <div className="overflow-x-auto -mx-3 sm:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <th className="py-2 sm:py-3 px-2 sm:px-4">Description</th>
                              <th className="py-2 sm:py-3 px-2 sm:px-4">Units</th>
                              <th className="py-2 sm:py-3 px-2 sm:px-4">Rate</th>
                              <th className="py-2 sm:py-3 px-2 sm:px-4 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {billData.items?.map((item, index) => (
                              <tr key={index} className="text-xs sm:text-sm text-gray-600">
                                <td className="py-3 sm:py-4 px-2 sm:px-4">{item.description}</td>
                                <td className="py-3 sm:py-4 px-2 sm:px-4">{item.units}</td>
                                <td className="py-3 sm:py-4 px-2 sm:px-4">{item.rate}</td>
                                <td className="py-3 sm:py-4 px-2 sm:px-4 text-right">{formatCurrency(item.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="space-y-2 pt-3 sm:pt-4 border-t border-gray-200">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="text-gray-800 font-medium">{formatCurrency(billData.amount)}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">Tax ({formatNumber(billData.taxRate, 1)}%)</span>
                        <span className="text-gray-800 font-medium">{formatCurrency(billData.taxAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm sm:text-base font-semibold pt-2 border-t border-gray-200">
                        <span>Total Due</span>
                        <span className="text-emerald-600">{formatCurrency(billData.totalAmount)}</span>
                      </div>
                    </div>

                    {/* Additional Notes */}
                    <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
                      <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">
                        Please ensure payment is made before the due date to avoid any late payment charges. For
                        questions about this bill, please contact energycove customer service at (555) 987-6543 or visit
                        www.energycove.com/support.
                      </p>
                    </div>

                    {/* Payment methods */}
                    <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 mt-6">
                      <div className="text-sm font-medium text-emerald-800 mb-2">Payment Methods</div>
                      <div className="text-xs text-emerald-700">
                        Online: www.energycove.com/pay
                        <br />
                        Phone: (555) 123-4567
                        <br />
                        Mail: PO Box 12345, Greenville, CA 94301
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics (right side) */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6">
            {/* Monthly usage chart */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent rounded-bl-full -mr-10 -mt-10 opacity-70"></div>
              <div className="relative">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg">
                      <Zap className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="font-semibold text-gray-800">Monthly Energy Usage</div>
                  </div>
                </div>

                <div className="h-64 mt-2 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-50 to-transparent rounded-lg"></div>
                  <div className="relative z-10 flex justify-between h-full items-end pb-8">
                    {analyticsData.monthlyUsage.map((month, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 group">
                        <div
                          className={`w-12 sm:w-16 ${
                            i === analyticsData.monthlyUsage.length - 1
                              ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                              : "bg-gradient-to-t from-gray-400 to-gray-300"
                          } rounded-t-md group-hover:from-emerald-700 group-hover:to-emerald-500 transition-colors relative`}
                          style={{ height: `${Math.max((month.usage / maxUsage) * 200, 20)}px` }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {month.usage} kWh
                          </div>
                        </div>
                        <div className="text-xs font-medium text-gray-600">{month.month}</div>
                      </div>
                    ))}
                  </div>

                  {/* X and Y axis labels */}
                  <div className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-center text-xs text-gray-500">
                    Months (Last 6 Months)
                  </div>
                  <div className="absolute top-0 bottom-8 left-0 w-8 flex items-center justify-center -rotate-90 text-xs text-gray-500">
                    Energy Usage (kWh)
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Average Usage:</span>{" "}
                    {Math.round(
                      analyticsData.monthlyUsage.reduce((acc, curr) => acc + curr.usage, 0) / 
                      analyticsData.monthlyUsage.length
                    )} kWh
                  </div>
                  <div className="text-sm text-emerald-600 font-medium">
                    {analyticsData.monthlyUsage.length >= 2 && 
                      (analyticsData.monthlyUsage[analyticsData.monthlyUsage.length - 1].usage > 
                      analyticsData.monthlyUsage[analyticsData.monthlyUsage.length - 2].usage ? "▲" : "▼")}
                    {analyticsData.monthlyUsage.length >= 2 ? 
                      Math.abs(
                        analyticsData.monthlyUsage[analyticsData.monthlyUsage.length - 1].usage - 
                        analyticsData.monthlyUsage[analyticsData.monthlyUsage.length - 2].usage
                      ) : 0} kWh from last month
                  </div>
                </div>
              </div>
            </div>

            {/* Usage insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Peak usage */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent rounded-bl-full -mr-10 -mt-10 opacity-70"></div>
                <div className="relative">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 p-2 rounded-lg">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="font-semibold text-gray-800">Peak Usage</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-gray-500 mb-1">Peak Usage Time</div>
                    <div className="text-xl font-bold text-gray-900">{analyticsData.peakUsage.time}</div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Percentage of Total</span>
                        <span className="font-medium">{analyticsData.peakUsage.percentage}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                          style={{ width: `${analyticsData.peakUsage.percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Peak Usage</span>
                        <span className="font-medium">{analyticsData.peakUsage.kWh} kWh</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                          style={{
                            width: `${(analyticsData.peakUsage.kWh / parseInt(billData.unitsConsumed, 10)) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 p-1.5 rounded-lg mt-0.5">
                        <Info className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-xs text-emerald-700">
                          Shifting usage away from peak hours could reduce your bill by up to 15%.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Potential savings */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent rounded-bl-full -mr-10 -mt-10 opacity-70"></div>
                <div className="relative">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 p-2 rounded-lg">
                        <Sun className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="font-semibold text-gray-800">Solar Savings</div>
                    </div>
                  </div>

                  <div className="flex justify-between mb-6">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Monthly Savings</div>
                      <div className="text-2xl font-bold text-emerald-600">
                        {analyticsData.potentialSavings.monthly}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Annual Savings</div>
                      <div className="text-2xl font-bold text-emerald-600">{analyticsData.potentialSavings.annual}</div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Bill Reduction</span>
                      <span className="font-medium">{analyticsData.potentialSavings.percentage}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full relative"
                        style={{ width: `${analyticsData.potentialSavings.percentage}%` }}
                      >
                        <div className="absolute inset-0 bg-emerald-400/30 animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mb-6">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Current Carbon</div>
                      <div className="text-sm font-medium text-gray-700">{analyticsData.carbonFootprint.current}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Potential Reduction</div>
                      <div className="text-sm font-medium text-emerald-600">
                        -{analyticsData.carbonFootprint.reduction}
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/quote"
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    <span className="font-medium">Generate Solar Quote</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Bill comparison */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent rounded-bl-full -mr-10 -mt-10 opacity-70"></div>
              <div className="relative">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="font-semibold text-gray-800">Bill Comparison</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="text-sm text-gray-500 mb-1">Current Bill</div>
                    <div className="text-xl font-medium text-gray-900">{formatCurrency(billData.totalAmount)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {billData.unitsConsumed} kWh @ Rs. {billData.ratePerUnit}/kWh
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="text-sm text-gray-500 mb-1">With Solar</div>
                    <div className="text-xl font-medium text-emerald-600">
                      {formatCurrency(billData.totalAmount ? Math.round(billData.totalAmount * 0.192) : 0)}
                    </div>
                    <div className="text-xs text-emerald-600 mt-1">80.8% reduction</div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="text-sm text-gray-500 mb-1">25-Year Savings</div>
                    <div className="text-xl font-medium text-emerald-600">
                      {formatCurrency(billData.totalAmount ? Math.round(billData.totalAmount * 0.808 * 12 * 25) : 0)}
                    </div>
                    <div className="text-xs text-emerald-600 mt-1">Including incentives</div>
                  </div>
                </div>

                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div className="flex items-start gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg mt-1">
                      <Info className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-emerald-800 mb-1">Personalized Recommendation</div>
                      <div className="text-sm text-emerald-700">
                        Based on your energy usage patterns, a {Math.ceil(parseInt(billData.unitsConsumed, 10) / 120)} kW solar system would offset approximately 80% of
                        your electricity bill, with an estimated payback period of 9.1 years.
                      </div>
                      <div className="mt-4">
                        <Link
                          href="/quote"
                          className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          View detailed sizing recommendation
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Link>
              <Link
                href="/quote"
                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <span>Generate Quote</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
