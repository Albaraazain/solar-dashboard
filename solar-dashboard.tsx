"use client"

import { useState } from "react"
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
} from "lucide-react"
import Image from "next/image"

export default function SolarDashboard() {
  const [activeTab, setActiveTab] = useState("Sizing")
  const [selectedPanelType, setSelectedPanelType] = useState("Monocrystalline")
  const [selectedInverterType, setSelectedInverterType] = useState("String Inverter")

  // Panel types data
  const panelTypes = [
    {
      name: "Monocrystalline",
      efficiency: "20-22%",
      warranty: "25 years",
      price: "$$$",
      description: "Highest efficiency and longest lifespan, ideal for limited roof space and premium installations.",
    },
    {
      name: "Polycrystalline",
      efficiency: "15-17%",
      warranty: "25 years",
      price: "$$",
      description: "Good balance of cost and performance, suitable for most residential installations.",
    },
    {
      name: "Thin Film",
      efficiency: "10-12%",
      warranty: "15 years",
      price: "$",
      description: "Flexible and lightweight, performs better in high temperatures and indirect light.",
    },
    {
      name: "Bifacial",
      efficiency: "22-24%",
      warranty: "30 years",
      price: "$$$$",
      description: "Captures light from both sides, ideal for ground mounts or reflective roof surfaces.",
    },
  ]

  // Inverter types data
  const inverterTypes = [
    {
      name: "String Inverter",
      efficiency: "96-97%",
      warranty: "10 years",
      price: "$",
      description: "Cost-effective solution for installations with minimal shading and consistent panel orientation.",
    },
    {
      name: "Microinverters",
      efficiency: "95-98%",
      warranty: "25 years",
      price: "$$$",
      description: "Optimizes each panel individually, ideal for complex roofs with partial shading.",
    },
    {
      name: "Power Optimizers",
      efficiency: "98-99%",
      warranty: "25 years",
      price: "$$",
      description: "Combines benefits of string inverters and microinverters for optimal performance and monitoring.",
    },
    {
      name: "Hybrid Inverter",
      efficiency: "96-97%",
      warranty: "10 years",
      price: "$$",
      description: "Supports battery storage integration, perfect for homes seeking energy independence.",
    },
  ]

  // Get the selected panel and inverter data
  const selectedPanel = panelTypes.find((panel) => panel.name === selectedPanelType) || panelTypes[0]
  const selectedInverter = inverterTypes.find((inverter) => inverter.name === selectedInverterType) || inverterTypes[0]

  // Custom scrollbar hiding styles
  const scrollbarHideStyles = `
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `

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
            <div className="text-sm text-gray-500 hidden sm:block">Albaraa Zain</div>
            <div className="h-8 w-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-medium shadow-md">
              A
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="relative mb-8 md:mb-10 bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-2xl overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 md:mb-4">
                Your Perfect Solar Solution
              </h1>
              <p className="text-emerald-50 mb-4 md:mb-6 text-base md:text-lg">
                Customized system sizing based on your energy profile and location data.
              </p>
              <div className="flex gap-3 md:gap-4">
                <button className="bg-white text-emerald-700 px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5">
                  Get Started
                </button>
                <button className="bg-emerald-800/30 text-white border border-white/30 px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium backdrop-blur-sm hover:bg-emerald-800/40 transition-all">
                  Learn More
                </button>
              </div>
            </div>
            <div className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-emerald-700/20 rounded-full animate-pulse"></div>
              <div className="absolute inset-4 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl md:text-5xl font-bold text-white mb-1 md:mb-2">7.5</div>
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
            {["Sizing", "Quotes", "Installation", "Monitoring"].map((tab) => (
              <button
                key={tab}
                className={`px-4 sm:px-6 py-2 sm:py-2.5 text-sm rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab
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

        {/* Main Content */}
        <div className="mb-8">
          <div className="mb-6 md:mb-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Solar System Sizing</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm md:text-base">
              Our AI has analyzed your energy consumption patterns and local weather data to recommend the optimal solar
              system for your needs.
            </p>
          </div>

          {/* Dashboard Cards - Using grid with auto-fill for responsive behavior */}
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
                  856 <span className="text-lg md:text-xl text-gray-500 font-normal">kWh</span>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
                      <span className="text-sm">Peak Hours</span>
                    </div>
                    <span className="text-sm font-medium">356 kWh</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-gray-800 mr-2"></div>
                      <span className="text-sm">Off-Peak</span>
                    </div>
                    <span className="text-sm font-medium">500 kWh</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                  <div>Jan</div>
                  <div>Dec</div>
                </div>
                <div className="h-20 md:h-24 mt-2 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-50 to-transparent rounded-lg"></div>
                  <div className="relative z-10 flex justify-between h-full items-end">
                    {[65, 70, 85, 75, 90, 95, 100, 90, 80, 75, 70, 65].map((height, i) => (
                      <div key={i} className="flex flex-col items-center gap-0 group">
                        <div
                          className="w-4 sm:w-6 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md group-hover:from-emerald-700 group-hover:to-emerald-500 transition-colors"
                          style={{ height: `${height * 0.2}px` }}
                        ></div>
                      </div>
                    ))}
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
                    <div className="font-semibold text-gray-800">Recommended System</div>
                  </div>
                  <div className="text-gray-400 group-hover:text-emerald-500 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-4xl md:text-5xl font-bold mb-2 text-gray-900 flex items-end gap-2">
                  7.5 <span className="text-lg md:text-xl text-gray-500 font-normal">kW</span>
                </div>
                <div className="text-sm text-gray-500 mb-4 md:mb-6">Optimized for your consumption pattern</div>

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
                      <span>5.0 kW</span>
                      <span>10.0 kW</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm">Number of Panels</div>
                    <div className="text-sm font-medium bg-emerald-100 px-3 py-1 rounded-full text-emerald-700">
                      21 panels
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm">Panel Wattage</div>
                    <div className="text-sm font-medium bg-emerald-100 px-3 py-1 rounded-full text-emerald-700">
                      360W
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
                    <div className="text-3xl md:text-4xl font-bold text-gray-900">5.2</div>
                    <div className="text-sm text-gray-500">Sun hours/day</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl md:text-4xl font-bold text-gray-900">92%</div>
                    <div className="text-sm text-gray-500">Efficiency</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 md:mb-6">
                  <div className="bg-gray-50 p-2 md:p-3 rounded-lg text-center">
                    <Cloud className="w-4 h-4 md:w-5 md:h-5 text-gray-400 mx-auto mb-1" />
                    <div className="text-xs text-gray-500">Cloud Cover</div>
                    <div className="text-xs md:text-sm font-medium">12%</div>
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
                  <div className="text-xl md:text-2xl font-bold text-emerald-700">10,950 kWh</div>
                  <div className="text-xs text-emerald-600 mt-1">+15% above regional average</div>
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
                      {panelTypes.map((panel) => (
                        <div
                          key={panel.name}
                          className={`flex-shrink-0 w-40 sm:w-48 p-3 md:p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            selectedPanelType === panel.name
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-gray-100 bg-white hover:border-emerald-200"
                          }`}
                          onClick={() => setSelectedPanelType(panel.name)}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div
                              className={`text-sm font-medium ${
                                selectedPanelType === panel.name ? "text-emerald-700" : "text-gray-800"
                              }`}
                            >
                              {panel.name}
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                selectedPanelType === panel.name
                                  ? "border-emerald-500 bg-emerald-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {selectedPanelType === panel.name && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <div className="text-xs text-gray-500">Efficiency</div>
                              <div className="text-xs font-medium">{panel.efficiency}</div>
                            </div>
                            <div className="flex justify-between">
                              <div className="text-xs text-gray-500">Warranty</div>
                              <div className="text-xs font-medium">{panel.warranty}</div>
                            </div>
                            <div className="flex justify-between">
                              <div className="text-xs text-gray-500">Price</div>
                              <div className="text-xs font-medium">{panel.price}</div>
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
                      <div className="text-sm font-medium text-emerald-800 mb-1">{selectedPanel.name} Panels</div>
                      <div className="text-sm text-emerald-700">{selectedPanel.description}</div>
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
                      {inverterTypes.map((inverter) => (
                        <div
                          key={inverter.name}
                          className={`flex-shrink-0 w-40 sm:w-48 p-3 md:p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            selectedInverterType === inverter.name
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-gray-100 bg-white hover:border-emerald-200"
                          }`}
                          onClick={() => setSelectedInverterType(inverter.name)}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div
                              className={`text-sm font-medium ${
                                selectedInverterType === inverter.name ? "text-emerald-700" : "text-gray-800"
                              }`}
                            >
                              {inverter.name}
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                selectedInverterType === inverter.name
                                  ? "border-emerald-500 bg-emerald-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {selectedInverterType === inverter.name && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <div className="text-xs text-gray-500">Efficiency</div>
                              <div className="text-xs font-medium">{inverter.efficiency}</div>
                            </div>
                            <div className="flex justify-between">
                              <div className="text-xs text-gray-500">Warranty</div>
                              <div className="text-xs font-medium">{inverter.warranty}</div>
                            </div>
                            <div className="flex justify-between">
                              <div className="text-xs text-gray-500">Price</div>
                              <div className="text-xs font-medium">{inverter.price}</div>
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
                      <div className="text-sm font-medium text-emerald-800 mb-1">{selectedInverter.name}</div>
                      <div className="text-sm text-emerald-700">{selectedInverter.description}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3D Roof Visualization - 6 columns, spans 2 rows */}
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
                <Image
                  src="/placeholder.svg?height=300&width=600"
                  alt="Roof Layout"
                  width={600}
                  height={300}
                  className="w-full h-full object-cover"
                />

                {/* 3D-like panel layout with perspective */}
                <div className="absolute inset-0 bg-black/10">
                  <div className="absolute inset-0 grid grid-cols-7 grid-rows-3 gap-1 p-8 transform perspective-800 rotateX-10">
                    {Array(21)
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
                    <div className="text-lg md:text-xl font-medium text-gray-900">42 m²</div>
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

            {/* Financial Analysis - 6 columns */}
            <div className="md:col-span-6 bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 group hover:shadow-xl transition-all h-full">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 md:p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div className="font-semibold">Financial Analysis</div>
                  </div>
                  <div className="text-xs sm:text-sm bg-white/20 px-2 sm:px-3 py-1 rounded-full backdrop-blur-sm">
                    25-Year Projection
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6">
                <div className="grid grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">System Cost</div>
                    <div className="text-2xl md:text-3xl font-bold text-gray-900">$22,500</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Tax Credit (30%)</div>
                    <div className="text-2xl md:text-3xl font-bold text-emerald-600">-$6,750</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Net Cost</div>
                    <div className="text-2xl md:text-3xl font-bold text-gray-900">$15,750</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Monthly Savings</div>
                    <div className="text-2xl md:text-3xl font-bold text-emerald-600">$145</div>
                  </div>
                </div>

                <div className="mb-6 md:mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium text-gray-800">Payback Period</div>
                    <div className="text-sm font-medium text-emerald-600">9.1 years</div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full mb-1 overflow-hidden">
                    <div className="h-full w-[45%] bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full relative">
                      <div className="absolute inset-0 bg-emerald-400/30 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0 years</span>
                    <span>10 years</span>
                    <span>20 years</span>
                  </div>
                </div>

                <div className="bg-emerald-50 p-4 md:p-5 rounded-xl border border-emerald-100 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-emerald-800 mb-1">25-Year Savings</div>
                      <div className="text-2xl md:text-3xl font-bold text-emerald-700">$58,250</div>
                    </div>
                    <div className="h-14 w-14 md:h-16 md:w-16 relative">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#d1fae5" strokeWidth="10" />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="10"
                          strokeDasharray="283"
                          strokeDashoffset="70"
                          transform="rotate(-90 50 50)"
                        >
                          <animate attributeName="stroke-dashoffset" from="283" to="70" dur="2s" fill="freeze" />
                        </circle>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-emerald-700">
                        370%
                      </div>
                    </div>
                  </div>
                </div>

                <button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-2 md:py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                  <span className="font-medium">Get Personalized Financing Options</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
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
                          7.5 kW system with 21 {selectedPanelType} panels (360W each)
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
                          {selectedInverterType} with{" "}
                          {selectedInverterType === "Microinverters" ? "21 units" : "1 central unit"}
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
                        <div className="text-sm font-medium text-emerald-800 mb-1">Battery Recommendation</div>
                        <div className="text-sm text-emerald-700">13.5 kWh Powerwall for 85% energy independence</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                  <button className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                    <span className="font-medium">Generate Detailed Report</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button className="flex-1 bg-white border border-emerald-200 text-emerald-700 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow hover:bg-emerald-50 transform hover:-translate-y-0.5">
                    <span className="font-medium">Request Installation Quote</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

