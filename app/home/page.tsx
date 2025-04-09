// File: app/home/page.tsx
"use client"

import React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Check, ChevronDown, FileText, Phone, Search, Shield, Sun, Zap } from "lucide-react"
import Link from "next/link"
import { supabase, createCustomer, createBill, generateMockBillData } from "@/utils/supabase"

export default function LandingPage() {
  const router = useRouter()
  const [billProvider, setBillProvider] = useState("MEPCO")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // List of bill providers
  const providers = [
    "MEPCO", "LESCO", "FESCO", "GEPCO", "IESCO", "PESCO", "QESCO", "SEPCO", "HESCO", "K-Electric"
  ]

  // Form validation with detailed logging
  const validateForm = () => {
    console.log("[Form Validation] Starting form validation...");
    console.log("[Form Validation] Current values:", {
      billProvider,
      referenceNumber,
      phoneNumber
    });

    if (!billProvider) {
      console.warn("[Form Validation] Missing bill provider");
      setError("Please select a bill provider");
      return false;
    }

    if (!referenceNumber || referenceNumber.length < 6) {
      console.warn("[Form Validation] Invalid reference number:", {
        value: referenceNumber,
        length: referenceNumber?.length
      });
      setError("Please enter a valid reference number");
      return false;
    }

    if (!phoneNumber || !phoneNumber.match(/^03\d{9}$/)) {
      console.warn("[Form Validation] Invalid phone number:", {
        value: phoneNumber,
        matchesFormat: phoneNumber?.match(/^03\d{9}$/) !== null
      });
      setError("Please enter a valid Pakistan phone number (e.g., 03XXXXXXXXX)");
      return false;
    }

    console.log("[Form Validation] Validation successful");
    setError("");
    return true;
  }

  // Handle form submission with detailed logging
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Form Submission] Starting form submission...");
    
    if (!validateForm()) {
      console.warn("[Form Submission] Form validation failed");
      return;
    }
    
    setIsSubmitting(true);
    console.log("[Form Submission] Form is now submitting");
    
    try {
      // Try to call the Supabase function, but fall back to mock data if it fails
      console.log("[API Call] Attempting to fetch bill data from Supabase function");
      let billData;
      try {
        const { data: response, error } = await supabase.functions.invoke('fetch-bill', {
          body: { referenceNumber }
        });
        
        if (error || !response) {
          console.warn("[API Call] fetch-bill failed, falling back to mock data:", {
            error: error?.message,
            errorDetails: error,
          });
          billData = { data: generateMockBillData(referenceNumber, phoneNumber) };
          console.log("[Mock Data] Generated mock bill data:", billData);
        } else {
          console.log("[API Call] Successfully received bill data:", response);
          billData = response;
          
          // Log detailed bill data for debugging
          console.log("[API Response Details] Parsed values:", {
            customerName: billData.data.customerName,
            amount: billData.data.amount,
            unitsConsumed: billData.data.unitsConsumed,
            issueDate: billData.data.issueDate,
            dueDate: billData.data.dueDate
          });
        }
      } catch (err) {
        console.warn("Using mock data because fetch-bill call failed:", err);
        billData = generateMockBillData(referenceNumber, phoneNumber);
      }
      
      // Date formatting helper
      const formatDate = (dateStr: string) => {
        if (!dateStr) return new Date().toISOString().split('T')[0];
        // Convert "25 MAR 25" format to "2025-03-25"
        const [day, month, year] = dateStr.split(' ');
        const monthMap: {[key: string]: string} = {
          'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
          'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
        };
        return `20${year}-${monthMap[month]}-${day.padStart(2, '0')}`;
      };

      // Create a customer record in Supabase with logging
      console.log("[Customer Creation] Preparing customer data");
      // Validate and format customer data from API response
      if (!billData.data.customerName) {
        console.warn("[Customer Creation] Missing customer name from API response");
      }

      const issueDate = formatDate(billData.data.issueDate);

      console.log("[Customer Creation] Parsed data:", {
        name: billData.data.customerName,
        issueDate: billData.data.issueDate,
        formattedDate: issueDate
      });

      const customerData = {
        name: billData.data.customerName || 'Anonymous',
        phone: phoneNumber,
        address: 'Unknown address', // Address not available in API response
        reference_number: referenceNumber,
        date: issueDate
      };

      console.log("[Customer Creation] Customer data prepared:", {
        ...customerData,
        exists: "Will be upserted if reference number exists"
      });
      
      // Attempt to create/update customer with upsert
      const customer = await createCustomer(customerData);
      if (customer) {
        console.log("[Customer Creation] Customer upserted successfully:", {
          id: customer.id,
          reference_number: referenceNumber
        });
      } else {
        console.error("[Customer Creation] Failed to upsert customer");
        throw new Error("Failed to create/update customer record");
      }
      
      // Format and validate bill data
      console.log("[Bill Creation] Preparing bill data");
      // Extract values from the nested data structure
      const amount = parseFloat(billData.data.amount?.replace(/[^0-9.-]+/g,""));
      const unitsConsumed = parseInt(billData.data.unitsConsumed?.replace(/[^0-9.-]+/g,""), 10);
      
      if (isNaN(amount)) {
        console.warn("[Bill Creation] Invalid amount from API:", billData.data.amount);
      }
      if (isNaN(unitsConsumed)) {
        console.warn("[Bill Creation] Invalid units consumed from API:", billData.data.unitsConsumed);
      }

      console.log("[Bill Creation] Formatting dates:", {
        issueDate: billData.data.issueDate,
        dueDate: billData.data.dueDate,
      });

      const supabaseBillData = {
        reference_number: referenceNumber,
        customer_name: billData.data.customerName || 'Anonymous',
        amount: isNaN(amount) ? 0 : amount,
        units_consumed: isNaN(unitsConsumed) ? 0 : unitsConsumed,
        issue_date: formatDate(billData.data.issueDate),
        due_date: formatDate(billData.data.dueDate),
        customer_id: customer?.id
      };
      console.log("[Bill Creation] Bill data prepared:", supabaseBillData);
      
      await createBill(supabaseBillData);
      console.log("[Bill Creation] Bill created successfully");
      
      // Store data and navigate with logging
      console.log("[Storage] Storing bill data in localStorage");
      localStorage.setItem('billData', JSON.stringify(billData));
      localStorage.setItem('billReference', referenceNumber);
      
      console.log("[Navigation] Redirecting to bill analysis page");
      router.push("/bill");
    } catch (error) {
      console.error('[Error Handler] Error processing bill:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      setError('Failed to fetch bill details. Please try again.');
    } finally {
      console.log("[Form Submission] Completing form submission");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">
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
          <div className="flex gap-4 items-center">
            <Link href="/about" className="text-sm text-gray-600 hover:text-emerald-600 transition-colors hidden md:block">
              About
            </Link>
            <Link href="/contact" className="text-sm text-gray-600 hover:text-emerald-600 transition-colors hidden md:block">
              Contact
            </Link>
            <button className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-medium border border-emerald-100 hover:bg-emerald-100 transition-all">
              Sign In
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 py-8 md:py-12">
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 md:mb-6">
              Analyze Your Electricity Bill & Save with Solar
            </h1>
            <p className="text-lg text-gray-600 mb-6 md:mb-8">
              Upload your electricity bill and discover how much you could save by switching to solar energy. Get personalized recommendations and quotes in minutes.
            </p>
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 p-1 rounded-full mt-0.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-gray-700">Analyze your electricity consumption patterns</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 p-1 rounded-full mt-0.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-gray-700">Get a personalized solar system recommendation</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 p-1 rounded-full mt-0.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-gray-700">Calculate potential savings and ROI</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="text-sm text-gray-500">Trusted by leading providers:</div>
              <div className="flex gap-4 items-center">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Bill Analysis Form */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="font-semibold text-xl">Bill Analysis Tool</div>
              </div>
              <p className="text-emerald-50 text-sm">
                Enter your bill details below to get started with your personalized solar analysis
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Bill Provider */}
              <div>
                <label htmlFor="billProvider" className="block text-sm font-medium text-gray-700 mb-2">
                  Bill Provider
                </label>
                <div className="relative">
                  <select
                    id="billProvider"
                    className="appearance-none block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
                    value={billProvider}
                    onChange={(e) => setBillProvider(e.target.value)}
                    required
                  >
                    {providers.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Reference Number */}
              <div>
                <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Bill Reference Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="referenceNumber"
                    className="block w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
                    placeholder="e.g., 27384901234"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  You can find this on the top right corner of your bill
                </p>
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    id="phoneNumber"
                    className="block w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
                    placeholder="03XXXXXXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Enter your Pakistan mobile number
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className={`w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                  isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                }`}
                disabled={isSubmitting}
              >
                <span className="font-medium">
                  {isSubmitting ? "Processing..." : "Analyze My Bill"}
                </span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <Shield className="w-4 h-4" />
                <span>Your information is secure and will not be shared</span>
              </div>
            </form>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-12 md:py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              How Our Bill Analysis Tool Works
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our advanced algorithm analyzes your electricity consumption patterns to provide personalized solar recommendations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
              <div className="bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">1. Enter Bill Details</h3>
              <p className="text-gray-600">
                Provide your bill provider, reference number, and contact information to get started
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
              <div className="bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">2. View Analysis</h3>
              <p className="text-gray-600">
                Our system analyzes your consumption patterns, peak usage times, and potential savings
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
              <div className="bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Sun className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">3. Get Solar Quote</h3>
              <p className="text-gray-600">
                Receive a personalized solar system recommendation with detailed ROI and savings analysis
              </p>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="py-12 md:py-16 bg-emerald-50 -mx-4 md:-mx-6 px-4 md:px-6 rounded-3xl mb-12">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              What Our Customers Say
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Join thousands of satisfied customers who have reduced their electricity bills with our solar solutions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                "I was skeptical at first, but after analyzing my bill with energycove, I installed a 5kW system. My electricity bill has been reduced by 70%!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-semibold">
                  A
                </div>
                <div>
                  <div className="font-medium text-gray-800">Ahmed K.</div>
                  <div className="text-xs text-gray-500">Lahore</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                "The bill analysis tool was incredibly accurate. It predicted my savings within 5% of what I'm actually saving now with my solar panels."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-semibold">
                  S
                </div>
                <div>
                  <div className="font-medium text-gray-800">Sara M.</div>
                  <div className="text-xs text-gray-500">Karachi</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                "The process was seamless from bill analysis to installation. I'm now saving over PKR 15,000 per month on my electricity bill."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-semibold">
                  F
                </div>
                <div>
                  <div className="font-medium text-gray-800">Faisal R.</div>
                  <div className="text-xs text-gray-500">Islamabad</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-8 md:p-12 mb-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Start Saving on Your Electricity Bill?
          </h2>
          <p className="text-emerald-50 mb-8 max-w-2xl mx-auto">
            Join thousands of homeowners who have reduced their electricity costs and carbon footprint with our solar solutions
          </p>
          <button 
            className="bg-white text-emerald-700 px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
            onClick={() => document.getElementById("billProvider")?.focus()}
          >
            Analyze My Bill Now
          </button>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 pt-8 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-1.5 rounded-lg shadow-sm">
                  <Sun className="w-4 h-4" />
                </div>
                <div className="font-bold">
                  energy<span className="text-emerald-600">cove</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Helping homeowners save money and reduce their carbon footprint with solar energy solutions
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-gray-400 hover:text-emerald-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-emerald-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-emerald-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
