/**
 * CarbonMesh Emission Factors Registry
 * Mirrored from data/factors.yaml
 * Strictly verified against national & international authorities (CEA, IPCC, DEFRA, TERI, MoEFCC)
 */

export const FACTORS_METADATA = {
  version: "2026.1",
  last_updated: "2026-10-28",
  currency: "INR",
  electricity_voltage_nominal: 230,
  grid_power_factor_assumed: 0.95
};

export const FACTORS = {
  electricity_grid_india: {
    id: "EF-ELEC-IN-01",
    name: "India Grid Electricity (Southern Regional Grid)",
    category: "electricity",
    factor_value: 0.716,
    unit: "kg CO2e / kWh",
    data_source: "Central Electricity Authority (CEA) CO2 Baseline Database for the Indian Power Sector, User Guide Version 19.0 (2024)",
    methodology: "Combined Margin (CM) weighting of Operating Margin (OM) and Build Margin (BM)",
    verified: true,
    citation_url: "https://cea.nic.in/cdm-co2-baseline-database"
  },
  diesel_stationary_generator: {
    id: "EF-FUEL-DIESEL-01",
    name: "Diesel (Stationary Power Generator)",
    category: "fuel",
    factor_value: 2.687,
    unit: "kg CO2e / Litre",
    data_source: "IPCC 2006 Guidelines for National Greenhouse Gas Inventories & UK DEFRA Conversion Factors 2024",
    methodology: "Direct combustion factor including CO2, CH4, and N2O warming potentials",
    verified: true,
    citation_url: "https://www.ipcc-nggip.iges.or.jp"
  },
  petrol_motor_gasoline: {
    id: "EF-FUEL-PETROL-01",
    name: "Petrol (Motor Gasoline)",
    category: "fuel",
    factor_value: 2.314,
    unit: "kg CO2e / Litre",
    data_source: "UK DEFRA Government GHG Conversion Factors 2024",
    methodology: "Direct emissions per litre of standard E10/E20 blended motor fuel",
    verified: true,
    citation_url: "https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting"
  },
  transport_commute_car_petrol: {
    id: "EF-TRANS-CAR-01",
    name: "Passenger Car (Average Petrol / ICE)",
    category: "transport",
    factor_value: 0.174,
    unit: "kg CO2e / passenger-km",
    data_source: "The Energy and Resources Institute (TERI) India & DEFRA 2024 Passenger Transport",
    methodology: "Average occupancy of 1.4 passengers per vehicle km",
    verified: true,
    citation_url: "https://www.teriin.org"
  },
  transport_commute_twowheeler: {
    id: "EF-TRANS-2W-01",
    name: "Two-Wheeler (Motorcycle / Scooter 100-150cc)",
    category: "transport",
    factor_value: 0.052,
    unit: "kg CO2e / passenger-km",
    data_source: "ARAI / CPCB India vehicular emission inventory database 2024",
    methodology: "Average real-world fuel economy of 48 km/L",
    verified: true,
    citation_url: "https://www.araiindia.com"
  },
  transport_commute_city_bus: {
    id: "EF-TRANS-BUS-01",
    name: "City Transit Bus (BMTC Diesel Fleet)",
    category: "transport",
    factor_value: 0.048,
    unit: "kg CO2e / passenger-km",
    data_source: "BMTC Bengaluru fleet emissions & TERI Sustainable Urban Transport Model",
    methodology: "Average peak-hour load factor of 42 passengers per urban transit bus",
    verified: true,
    citation_url: "https://mybmtc.karnataka.gov.in"
  },
  transport_commute_active_zero: {
    id: "EF-TRANS-ZERO-01",
    name: "Active Commute (Walking / Bicycle / Zero-emission EV)",
    category: "transport",
    factor_value: 0.000,
    unit: "kg CO2e / passenger-km",
    data_source: "GHG Protocol Scope 3 Category 7 Employee Commuting Standard",
    methodology: "Direct tailpipe emission zero baseline",
    verified: true,
    citation_url: "https://ghgprotocol.org"
  },
  waste_municipal_landfill: {
    id: "EF-WASTE-MSW-01",
    name: "Mixed Municipal Solid Waste (Landfilled / Anaerobic)",
    category: "waste",
    factor_value: 0.520,
    unit: "kg CO2e / kg waste",
    data_source: "Ministry of Environment, Forest and Climate Change (MoEFCC) India & IPCC Waste Model",
    methodology: "First-order decay model with 50% methane gas capture avoidance",
    verified: true,
    citation_url: "https://moef.gov.in"
  }
};

/**
 * Resolves factor by key or ID
 */
export function getFactor(identifier) {
  if (FACTORS[identifier]) return FACTORS[identifier];
  return Object.values(FACTORS).find(f => f.id === identifier) || null;
}

/**
 * Calculates emissions for electricity (Scope 2)
 */
export function calcElectricityEmission(kwh) {
  const factor = FACTORS.electricity_grid_india;
  const kg = Number((kwh * factor.factor_value).toFixed(4));
  return {
    kwh,
    kgCO2e: kg,
    factorId: factor.id,
    factorValue: factor.factor_value,
    unit: factor.unit,
    formula: `${kwh} kWh × ${factor.factor_value} kg CO2e/kWh = ${kg} kg CO2e`,
    citation: factor.data_source,
    quality: "measured"
  };
}

/**
 * Calculates emissions for transport commute (Scope 3)
 */
export function calcCommuteEmission(mode, km = 12) {
  let factorKey = 'transport_commute_active_zero';
  if (mode === 'car') factorKey = 'transport_commute_car_petrol';
  else if (mode === 'bike' || mode === '2w') factorKey = 'transport_commute_twowheeler';
  else if (mode === 'bus') factorKey = 'transport_commute_city_bus';
  else if (mode === 'walk' || mode === 'cycle') factorKey = 'transport_commute_active_zero';

  const factor = FACTORS[factorKey];
  const carFactor = FACTORS.transport_commute_car_petrol;

  const actualKg = Number((km * factor.factor_value).toFixed(4));
  const carBaselineKg = Number((km * carFactor.factor_value).toFixed(4));
  const avoidedKg = Number(Math.max(0, carBaselineKg - actualKg).toFixed(4));

  return {
    mode,
    km,
    kgCO2e: actualKg,
    avoidedKgCO2e: avoidedKg,
    factorId: factor.id,
    factorValue: factor.factor_value,
    unit: factor.unit,
    formula: `${km} km × ${factor.factor_value} kg CO2e/km = ${actualKg} kg CO2e`,
    citation: factor.data_source,
    quality: "manual"
  };
}

/**
 * Calculates emissions for fuel combustion (Scope 1)
 */
export function calcFuelEmission(fuelType, litres) {
  const factorKey = fuelType === 'diesel' ? 'diesel_stationary_generator' : 'petrol_motor_gasoline';
  const factor = FACTORS[factorKey];
  const kg = Number((litres * factor.factor_value).toFixed(4));
  return {
    fuelType,
    litres,
    kgCO2e: kg,
    factorId: factor.id,
    factorValue: factor.factor_value,
    unit: factor.unit,
    formula: `${litres} L × ${factor.factor_value} kg CO2e/L = ${kg} kg CO2e`,
    citation: factor.data_source,
    quality: "manual"
  };
}

/**
 * Calculates emissions for municipal solid waste (Scope 3 / Scope 1)
 */
export function calcWasteEmission(fillPercent, binVolumeLitre = 50, wasteDensityKgPerLitre = 0.2) {
  const factor = FACTORS.waste_municipal_landfill;
  const estimatedKgWaste = Number(((fillPercent / 100) * binVolumeLitre * wasteDensityKgPerLitre).toFixed(2));
  const kgCO2e = Number((estimatedKgWaste * factor.factor_value).toFixed(4));

  return {
    fillPercent,
    estimatedKgWaste,
    kgCO2e,
    factorId: factor.id,
    factorValue: factor.factor_value,
    unit: factor.unit,
    formula: `${estimatedKgWaste} kg waste × ${factor.factor_value} kg CO2e/kg = ${kgCO2e} kg CO2e`,
    citation: factor.data_source,
    quality: "estimated"
  };
}

