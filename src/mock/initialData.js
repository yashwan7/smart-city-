/**
 * Initial dynamic realistic mock data for ₹uta platform
 * Pre-populates all modules to make the app feel alive and active immediately.
 */

export const INITIAL_USER = {
  id: "USR-2026-091",
  fullName: "Yashwanth Gowda",
  email: "yashwanth@izanagi.eco",
  phone: "+91 98451 23049",
  dob: "2003-08-14",
  maskedAadhaar: "•••• •••• 8914",
  avatar: "🌱",
  rankTier: "Eco-Yodha",
  level: 14,
  xp: 3420,
  nextLevelXp: 4000,
  city: "Bengaluru, Karnataka",
  cluster: "Sai Vidya Tech Cluster",
  joinedDate: "Jan 2026",
};

export const INITIAL_HARDWARE_STATE = {
  connected: true,
  nodeId: "ESP32-MESH-PULSE-01",
  firmwareVersion: "v2.4.1-EdgeLock",
  lastPingSecondsAgo: 1,
  liveWatts: 3420, // 3.42 kW
  voltage: 231.4,
  frequencyHz: 50.02,
  powerFactor: 0.96,
  signalStrengthDbm: -62,
  meshRelayStatus: "NORMAL", // NORMAL | SHED_ACTIVE
};

// Power Pulse (Electricity Dashboard)
export const INITIAL_POWER_PULSE_DATA = {
  currentKwh: 3.42,
  todayTotalKwh: 14.8,
  monthlyTotalKwh: 342.5,
  carbonLoadKg: 10.36, // 14.8 * 0.70 kg/kWh
  gridFactorKgPerKwh: 0.70,
  ecoMode: false,
  hourlyHistory: [
    { hour: "00:00", kwh: 0.45, peak: false },
    { hour: "02:00", kwh: 0.38, peak: false },
    { hour: "04:00", kwh: 0.42, peak: false },
    { hour: "06:00", kwh: 1.15, peak: false },
    { hour: "08:00", kwh: 2.85, peak: true },
    { hour: "10:00", kwh: 1.95, peak: false },
    { hour: "12:00", kwh: 2.45, peak: true },
    { hour: "14:00", kwh: 1.80, peak: false },
    { hour: "16:00", kwh: 2.10, peak: false },
    { hour: "18:00", kwh: 3.65, peak: true },
    { hour: "20:00", kwh: 3.42, peak: true },
    { hour: "22:00", kwh: 1.60, peak: false },
  ],
};
export const INITIAL_URJA_DATA = INITIAL_POWER_PULSE_DATA;

// Eco Commute (Vehicle & Transit Tracker - STATIC until manual user input)
export const INITIAL_ECO_COMMUTE_DATA = {
  todayKm: 23,
  fuelBurnedLitres: 1.35,
  transportEmissionsKg: 3.62,
  activeMode: "Petrol Car",
  distanceSlider: 18,
  fuelSlider: 1.35,
  trips: [
    {
      id: "TRIP-01",
      mode: "Petrol Car",
      distanceKm: 18,
      fuelType: "Petrol",
      fuelLitres: 1.35,
      emissionsKg: 3.24,
      timestamp: "Today, 09:15 AM",
      route: "Hebbal → Whitefield Tech Park",
    },
    {
      id: "TRIP-02",
      mode: "Electric Two-Wheeler",
      distanceKm: 5,
      fuelType: "EV Clean Charge",
      fuelLitres: 0,
      emissionsKg: 0.38,
      timestamp: "Today, 01:30 PM",
      route: "Campus Hub → Green Canteen",
    },
    {
      id: "TRIP-03",
      mode: "Namma Metro (Purple Line)",
      distanceKm: 14,
      fuelType: "Electric Transit",
      fuelLitres: 0,
      emissionsKg: 0.42,
      timestamp: "Yesterday, 06:40 PM",
      route: "MG Road → Indiranagar",
    },
  ],
};
export const INITIAL_GATI_DATA = INITIAL_ECO_COMMUTE_DATA;

// Spend Log (Consumer Purchases Log)
export const INITIAL_SPEND_LOG_PURCHASES = [
  {
    id: "SPL-101",
    item: "Handwoven Khadi Shirt",
    category: "Apparel",
    embodiedKg: 1.2,
    isEco: true,
    priceInr: 850,
    date: "Oct 27, 2026",
    badge: "Eco Choice 🌿",
  },
  {
    id: "SPL-102",
    item: "Takeaway Fast Food Meal",
    category: "Food",
    embodiedKg: 4.8,
    isEco: false,
    priceInr: 320,
    date: "Oct 26, 2026",
    badge: "High Embodied ⚡",
  },
  {
    id: "SPL-103",
    item: "Handmade Terracotta Chai Cups (Set of 6)",
    category: "Home",
    embodiedKg: 0.6,
    isEco: true,
    priceInr: 240,
    date: "Oct 25, 2026",
    badge: "Zero Plastic 🏺",
  },
  {
    id: "SPL-104",
    item: "Organic Black Rice (1kg)",
    category: "Groceries",
    embodiedKg: 0.9,
    isEco: true,
    priceInr: 180,
    date: "Oct 24, 2026",
    badge: "Local Agro 🌱",
  },
  {
    id: "SPL-105",
    item: "Plastic Packaged Sparkling Soda",
    category: "Beverages",
    embodiedKg: 2.1,
    isEco: false,
    priceInr: 95,
    date: "Oct 23, 2026",
    badge: "Single-Use ⚠️",
  },
];
export const INITIAL_KRAYA_PURCHASES = INITIAL_SPEND_LOG_PURCHASES;

// Compost Nest (Organic & Wet Waste / Biogas - STRICTLY ONLY automated IoT sensor module)
export const INITIAL_COMPOST_NEST_DATA = {
  wetWasteTodayKg: 4.2,
  wetWasteMonthKg: 28.6,
  compostMaturityPct: 78,
  daysToReady: 4,
  biogasEquivalentKwh: 6.85,
  methaneOffsetKg: 5.72,
  biocharAddedKg: 3.5,
  aerationStatus: "Optimal (48°C thermophilic)",
  // Automated IoT Telemetry fields
  humidityPct: 62.4,
  internalTempC: 48.5,
  soilMoisturePct: 58.2,
  binFillPct: 64,
  sensorNodeStatus: "Node-B (ESP32-Waste) Linked",
  lastSensorReading: "Just now (Auto-streamed)",
  recentDeposits: [
    { id: "DEP-01", weightKg: 2.1, type: "Vegetable peels & coffee grounds", time: "Today, 08:30 AM" },
    { id: "DEP-02", weightKg: 2.1, type: "Cooked rice & garden trimmings", time: "Today, 02:15 PM" },
    { id: "DEP-03", weightKg: 3.8, type: "Fruit waste & dry leaves", time: "Yesterday, 07:45 PM" },
  ],
};
export const INITIAL_SAMPUTA_DATA = INITIAL_COMPOST_NEST_DATA;

// Wallet & CCTS Data (70% user retainable, 30% direct verified green NGO fund)
export const INITIAL_WALLET_DATA = {
  totalCredits: 142.0,
  inrExchangeRate: 10.0, // 1 ₹-Credit = ₹10 INR (CCTS Standard)
  userSharePct: 70,       // 70% available for user withdrawal
  ngoSharePct: 30,        // 30% routed to verified green tech fund
  withdrawnCredits: 35.0,
  transactions: [
    { id: "TX-901", type: "EARN", desc: "Compost Nest Biochar Batch #4 Auto-Verified", credits: +18.5, date: "Today, 10:12 AM" },
    { id: "TX-902", type: "EARN", desc: "Power Pulse Off-Peak Load Shedding Reward", credits: +8.0, date: "Yesterday, 08:00 PM" },
    { id: "TX-903", type: "SPEND", desc: "Green Mart: Bamboo Utility Kit", credits: -10.0, date: "Oct 26, 2026" },
    { id: "TX-904", type: "DONATE", desc: "Western Ghats Micro-Donation", credits: -5.0, date: "Oct 25, 2026" },
  ],
};

// Green Mart (Eco-Shopping Hub with Authentic High-Resolution Unsplash Photography)
export const INITIAL_GREEN_MART_ITEMS = [
  {
    id: "MART-01",
    name: "Handloom Khadi Organic Kurta",
    category: "Wearable",
    priceCredits: 25,
    priceInrEquivalent: 250,
    carbonOffsetKg: 4.2,
    image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80",
    description: "Pure hand-spun unbleached cotton, zero motorized carbon weaving.",
    stock: 8,
    tag: "Handloom",
  },
  {
    id: "MART-02",
    name: "Traditional Terracotta Matka Cooler",
    category: "Cooling",
    priceCredits: 15,
    priceInrEquivalent: 150,
    carbonOffsetKg: 18.5,
    image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80",
    description: "Natural evaporative water cooler. Replaces 60W domestic fridge power daily.",
    stock: 14,
    tag: "Zero Electricity",
  },
  {
    id: "MART-03",
    name: "Bamboo Cutlery & Dining Travel Kit",
    category: "Zero Waste",
    priceCredits: 10,
    priceInrEquivalent: 100,
    carbonOffsetKg: 2.8,
    image: "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=600&q=80",
    description: "Biodegradable cutlery, straw, and carrying pouch replacing 400 single-use plastics.",
    stock: 30,
    tag: "Plastic Free",
  },
  {
    id: "MART-04",
    name: "Native Seed Bombs & Biochar Soil Kit",
    category: "Soil Health",
    priceCredits: 20,
    priceInrEquivalent: 200,
    carbonOffsetKg: 8.0,
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80",
    description: "Centuries-durable soil carbon sequestration and 20 native pollinator wildflower seeds.",
    stock: 22,
    tag: "Carbon Sink",
  },
  {
    id: "MART-05",
    name: "Solar Lantern with Micro-USB Output",
    category: "Clean Energy",
    priceCredits: 40,
    priceInrEquivalent: 400,
    carbonOffsetKg: 24.0,
    image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=600&q=80",
    description: "High-efficiency monocrystalline solar lamp with 12-hour night illumination & device charging.",
    stock: 6,
    tag: "Off-Grid",
  },
  {
    id: "MART-06",
    name: "Vetiver / Khus Natural Cooling Mat",
    category: "Personal Care",
    priceCredits: 18,
    priceInrEquivalent: 180,
    carbonOffsetKg: 5.5,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
    description: "Aromatic indigenous grass root mat providing passive ambient cooling and stress relief.",
    stock: 12,
    tag: "Native Craft",
  },
];
export const INITIAL_HAAT_ITEMS = INITIAL_GREEN_MART_ITEMS;

// Eco Tribe (Locality Leaderboard with Cluster Switcher)
export const INITIAL_ECO_TRIBE_CLUSTERS = {
  saividya: [
    { rank: 1, name: "Dr. Ananya Murthy", badge: "Solar Queen ☀️", points: 4890, credits: 215, offsetKg: 420.5, avatar: "👩‍🔬" },
    { rank: 2, name: "Yashwanth Gowda (You)", badge: "Eco-Yodha ⚡", points: 3420, credits: 142, offsetKg: 312.8, avatar: "🌱", isCurrentUser: true },
    { rank: 3, name: "Medha Umesh", badge: "Mesh Architect 🛡️", points: 3290, credits: 138, offsetKg: 298.4, avatar: "👩‍💻" },
    { rank: 4, name: "Karthik R. Nair", badge: "Leaf Master 🍃", points: 2980, credits: 119, offsetKg: 265.1, avatar: "👨‍🌾" },
    { rank: 5, name: "Priya Chandrashekar", badge: "Prithvi Guardian 🌏", points: 2750, credits: 104, offsetKg: 240.0, avatar: "🌿" },
    { rank: 6, name: "Suresh Patil", badge: "Bhoomi Mitra 🌾", points: 2410, credits: 92, offsetKg: 210.6, avatar: "🧑‍🌾" },
    { rank: 7, name: "Harini Venkatesh", badge: "Compost Sage 🏺", points: 2180, credits: 85, offsetKg: 195.2, avatar: "🪴" },
  ],
  bangalore: [
    { rank: 1, name: "RV University Green Hub", badge: "Campus Leader 🏛️", points: 7420, credits: 380, offsetKg: 890.0, avatar: "🎓" },
    { rank: 2, name: "Whitefield Tech Sanctuary", badge: "Microgrid Pro ⚡", points: 6150, credits: 310, offsetKg: 712.4, avatar: "🏢" },
    { rank: 3, name: "Dr. Ananya Murthy", badge: "Solar Queen ☀️", points: 4890, credits: 215, offsetKg: 420.5, avatar: "👩‍🔬" },
    { rank: 4, name: "Hebbal Clean Corridor", badge: "Transit Champions 🚲", points: 4210, credits: 195, offsetKg: 380.2, avatar: "🚴" },
    { rank: 5, name: "Yashwanth Gowda (You)", badge: "Eco-Yodha ⚡", points: 3420, credits: 142, offsetKg: 312.8, avatar: "🌱", isCurrentUser: true },
    { rank: 6, name: "Indiranagar Eco Guild", badge: "Zero Waste Tribe 🌿", points: 3100, credits: 130, offsetKg: 275.6, avatar: "🏡" },
    { rank: 7, name: "IISc Climate Circle", badge: "Carbon Research 🔬", points: 2950, credits: 122, offsetKg: 260.0, avatar: "🧪" },
  ],
  allindia: [
    { rank: 1, name: "IIT Bombay Solar Alliance", badge: "National Apex 🇮🇳", points: 9840, credits: 520, offsetKg: 1420.0, avatar: "🏆" },
    { rank: 2, name: "Delhi Clean Rooftop Co-op", badge: "Megawatt Pioneer ☀️", points: 8650, credits: 440, offsetKg: 1180.5, avatar: "🏙️" },
    { rank: 3, name: "RV University Green Hub", badge: "Campus Leader 🏛️", points: 7420, credits: 380, offsetKg: 890.0, avatar: "🎓" },
    { rank: 4, name: "Pune Biochar Co-op", badge: "Soil Sequestrator 🌾", points: 5890, credits: 290, offsetKg: 640.2, avatar: "🌱" },
    { rank: 5, name: "Chennai Coastal Mangrove", badge: "Blue Carbon Shield 🌊", points: 5120, credits: 245, offsetKg: 580.4, avatar: "🦀" },
    { rank: 6, name: "Dr. Ananya Murthy", badge: "Solar Queen ☀️", points: 4890, credits: 215, offsetKg: 420.5, avatar: "👩‍🔬" },
    { rank: 7, name: "Yashwanth Gowda (You)", badge: "Eco-Yodha ⚡", points: 3420, credits: 142, offsetKg: 312.8, avatar: "🌱", isCurrentUser: true },
  ],
};
export const INITIAL_LEADERBOARD = INITIAL_ECO_TRIBE_CLUSTERS.saividya;

export const INITIAL_IMPACT_PROJECTS = [
  {
    id: "IMP-01",
    title: "Western Ghats Agroforestry Restoration",
    organization: "SayTrees Environmental Trust",
    verifiedStandard: "Verified Carbon Standard (VCS)",
    raisedCredits: 4210,
    targetCredits: 5000,
    progressPct: 84,
    impactSummary: "12,400 native indigenous saplings planted across degraded tea estates.",
    icon: "🌳",
  },
  {
    id: "IMP-02",
    title: "Bengaluru Urban Lake Revitalization",
    organization: "Anand Malligavad Lake Foundation",
    verifiedStandard: "CCTS Ecological Credit",
    raisedCredits: 3120,
    targetCredits: 4000,
    progressPct: 78,
    impactSummary: "Natural wetlands filtration treating 1.2 million litres of storm runoff.",
    icon: "💧",
  },
  {
    id: "IMP-03",
    title: "Rural Biogas & Smokeless Chulhas",
    organization: "Clean Energy Rural Alliance",
    verifiedStandard: "Gold Standard Micro-Scale",
    raisedCredits: 1890,
    targetCredits: 2500,
    progressPct: 75,
    impactSummary: "Displacing firewood and black carbon soot for 180 rural Karnataka kitchens.",
    icon: "🔥",
  },
];

export const INITIAL_SCHEDULER_DATA = {
  mode: "SIMULATION",
  manualOverride: false,
  isArmed: true,
  currentSlot: 14,
  currentTime: "11:00",
  summary: {
    baseline: {
      total_cost: 147.60,
      total_carbon_kg: 10.771,
      completion_fraction: 1.0,
    },
    optimized: {
      total_cost: 108.60,
      total_carbon_kg: 6.407,
      completion_fraction: 1.0,
    },
    savings: {
      cost_saved: 39.00,
      pct_cost_saved: 26.4,
      carbon_saved_kg: 4.364,
      pct_carbon_saved: 40.5,
    },
    horns_condition_guarantee: true,
  },
  jobs: [
    { id: "ev_charge", name: "EV Fast Charger", category: "transport", release_time: "06:00", deadline_time: "19:00", total_units_kwh: 8, completed_kwh: 4, remaining_kwh: 4, status: "IN_PROGRESS", guaranteed_on_time: true, power_kw: 3.6 },
    { id: "heat_pump", name: "Smart Heat Pump / HVAC", category: "cooling", release_time: "08:00", deadline_time: "16:00", total_units_kwh: 5, completed_kwh: 2, remaining_kwh: 3, status: "IN_PROGRESS", guaranteed_on_time: true, power_kw: 2.0 },
    { id: "water_geyser", name: "Thermal Water Geyser", category: "thermal", release_time: "05:00", deadline_time: "10:00", total_units_kwh: 3, completed_kwh: 3, remaining_kwh: 0, status: "COMPLETED", guaranteed_on_time: true, power_kw: 2.5 },
    { id: "dishwasher", name: "Eco Washing Cycle", category: "appliance", release_time: "09:00", deadline_time: "15:00", total_units_kwh: 2, completed_kwh: 0, remaining_kwh: 2, status: "QUEUED", guaranteed_on_time: true, power_kw: 1.5 },
    { id: "battery_bank", name: "Solar Battery Storage Bank", category: "storage", release_time: "10:00", deadline_time: "18:00", total_units_kwh: 6, completed_kwh: 1, remaining_kwh: 5, status: "IN_PROGRESS", guaranteed_on_time: true, power_kw: 3.0 },
  ],
};
