import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  INITIAL_USER,
  INITIAL_HARDWARE_STATE,
  INITIAL_POWER_PULSE_DATA,
  INITIAL_ECO_COMMUTE_DATA,
  INITIAL_SPEND_LOG_PURCHASES,
  INITIAL_COMPOST_NEST_DATA,
  INITIAL_WALLET_DATA,
  INITIAL_GREEN_MART_ITEMS,
  INITIAL_ECO_TRIBE_CLUSTERS,
  INITIAL_IMPACT_PROJECTS,
  INITIAL_SCHEDULER_DATA,
} from '../mock/initialData';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Auth & Profile
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ruta_user');
    return saved ? JSON.parse(saved) : INITIAL_USER;
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Hardware IoT Telemetry
  const [hardware, setHardware] = useState(() => {
    const saved = localStorage.getItem('ruta_hardware');
    return saved ? JSON.parse(saved) : INITIAL_HARDWARE_STATE;
  });

  // Power Pulse (Electricity Dashboard)
  const [powerPulse, setPowerPulse] = useState(() => {
    const saved = localStorage.getItem('ruta_power_pulse');
    return saved ? JSON.parse(saved) : INITIAL_POWER_PULSE_DATA;
  });

  // Eco Commute (Vehicle & Transit Tracker - STATIC until manual user input)
  const [ecoCommute, setEcoCommute] = useState(() => {
    const saved = localStorage.getItem('ruta_eco_commute');
    return saved ? JSON.parse(saved) : INITIAL_ECO_COMMUTE_DATA;
  });

  // Spend Log (Consumer Purchases Log)
  const [spendLog, setSpendLog] = useState(() => {
    const saved = localStorage.getItem('ruta_spend_log');
    return saved ? JSON.parse(saved) : INITIAL_SPEND_LOG_PURCHASES;
  });

  // Compost Nest (Organic & Wet Waste / Biogas - ONLY module with automated IoT sensor telemetry)
  const [compostNest, setCompostNest] = useState(() => {
    const saved = localStorage.getItem('ruta_compost_nest');
    return saved ? JSON.parse(saved) : INITIAL_COMPOST_NEST_DATA;
  });

  // Wallet & CCTS
  const [wallet, setWallet] = useState(() => {
    const saved = localStorage.getItem('ruta_wallet');
    return saved ? JSON.parse(saved) : INITIAL_WALLET_DATA;
  });

  // Green Mart & Impact Projects
  const [greenMartItems, setGreenMartItems] = useState(INITIAL_GREEN_MART_ITEMS);
  const [impactProjects, setImpactProjects] = useState(INITIAL_IMPACT_PROJECTS);

  // Eco Tribe Clusters ('saividya' | 'bangalore' | 'allindia')
  const [activeCluster, setActiveCluster] = useState('saividya');
  const [clustersData, setClustersData] = useState(INITIAL_ECO_TRIBE_CLUSTERS);

  // Carbon-Aware Smart Load Scheduler State
  const [scheduler, setScheduler] = useState(() => {
    const saved = localStorage.getItem('ruta_scheduler');
    return saved ? JSON.parse(saved) : INITIAL_SCHEDULER_DATA;
  });

  // Live Auto-simulation stream toggle
  const [autoSimulate, setAutoSimulate] = useState(true);
  const [notification, setNotification] = useState(null);

  // Navigation tab: 'dashboard' | 'power-pulse' | 'eco-commute' | 'compost-nest' | 'spend-log' | 'green-mart' | 'eco-tribe' | 'wallet'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Chotu-Eco AI Buddy Chat State
  const [chotuMessages, setChotuMessages] = useState([
    {
      id: 'm1',
      sender: 'chotu',
      text: "Yo bro! I'm Chotu-Eco, your personal sustainability wingman! 🌱 I'm watching your live energy and compost right now.",
      time: 'Just now',
    },
    {
      id: 'm2',
      sender: 'chotu',
      text: "Bro, your house is pulling 3.4 kW right now — toggle Eco Mode in Power Pulse or flip the relay to save +15 credits!",
      time: 'Just now',
    },
  ]);
  const [isChotuOpen, setIsChotuOpen] = useState(false);

  // LocalStorage sync
  useEffect(() => {
    localStorage.setItem('ruta_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('ruta_hardware', JSON.stringify(hardware));
  }, [hardware]);

  useEffect(() => {
    localStorage.setItem('ruta_power_pulse', JSON.stringify(powerPulse));
  }, [powerPulse]);

  useEffect(() => {
    localStorage.setItem('ruta_eco_commute', JSON.stringify(ecoCommute));
  }, [ecoCommute]);

  useEffect(() => {
    localStorage.setItem('ruta_spend_log', JSON.stringify(spendLog));
  }, [spendLog]);

  useEffect(() => {
    localStorage.setItem('ruta_compost_nest', JSON.stringify(compostNest));
  }, [compostNest]);

  useEffect(() => {
    localStorage.setItem('ruta_wallet', JSON.stringify(wallet));
  }, [wallet]);

  useEffect(() => {
    localStorage.setItem('ruta_scheduler', JSON.stringify(scheduler));
  }, [scheduler]);

  // Toast notification helper
  const notify = (title, message, type = 'mint') => {
    setNotification({ title, message, type, id: Date.now() });
    setTimeout(() => {
      setNotification((prev) => (prev && Date.now() - prev.id >= 3800 ? null : prev));
    }, 4000);
  };

  // Confetti trigger helper
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 85,
        spread: 65,
        origin: { y: 0.7 },
        colors: ['#2DD4BF', '#FB7185', '#FBBF24', '#A78BFA', '#34D399'],
      });
    } catch (e) {
      // safe fallback
    }
  };

  // Hardware Controls
  const toggleHardwareConnection = () => {
    setHardware((prev) => {
      const next = !prev.connected;
      notify(
        next ? 'Hardware Linked [Connected]' : 'Hardware Offline [Disconnected]',
        next ? 'ESP32 mesh telemetry streaming live.' : 'Sensors running in offline fallback mode.',
        next ? 'mint' : 'amber'
      );
      return {
        ...prev,
        connected: next,
        liveWatts: next ? 3200 + Math.floor(Math.random() * 400) : 0,
      };
    });
  };

  const toggleRelayLoadShed = () => {
    setHardware((prev) => {
      const nextStatus = prev.meshRelayStatus === 'NORMAL' ? 'SHED_ACTIVE' : 'NORMAL';
      const powerReduction = nextStatus === 'SHED_ACTIVE' ? 1400 : 0;
      setPowerPulse((u) => ({
        ...u,
        currentKwh: Math.max(1.2, +(u.currentKwh - (nextStatus === 'SHED_ACTIVE' ? 1.4 : -1.4)).toFixed(2)),
      }));
      notify(
        nextStatus === 'SHED_ACTIVE' ? 'Relay Load Shed Activated' : 'Normal Grid Load Restored',
        nextStatus === 'SHED_ACTIVE' ? 'Non-critical loads isolated. Cut 1.4 kW peak load!' : 'HVAC and pumps returned to normal cycle.',
        nextStatus === 'SHED_ACTIVE' ? 'coral' : 'mint'
      );
      return {
        ...prev,
        meshRelayStatus: nextStatus,
        liveWatts: Math.max(800, prev.liveWatts - powerReduction),
      };
    });
  };

  // Power Pulse Controls
  const toggleEcoMode = () => {
    setPowerPulse((prev) => {
      const nextEco = !prev.ecoMode;
      const kwhDelta = nextEco ? -0.85 : 0.85;
      const nextKwh = Math.max(1.1, +(prev.currentKwh + kwhDelta).toFixed(2));
      notify(
        nextEco ? 'Power Pulse Eco-Mode On 🌱' : 'Power Pulse Standard Mode',
        nextEco ? 'Grid pull reduced by 25%. Solar priority enabled.' : 'Standard comfort schedule restored.',
        'mint'
      );
      return {
        ...prev,
        ecoMode: nextEco,
        currentKwh: nextKwh,
        carbonLoadKg: +(nextKwh * prev.gridFactorKgPerKwh).toFixed(2),
      };
    });
  };

  // Eco Commute Controls (PRACTICAL MANUAL ENTRY: NEVER JITTER COMMUTE TELEMETRY AUTOMATICALLY)
  const updateEcoCommuteSliders = (distanceKm, fuelLitres) => {
    const emissionsKg = +(distanceKm * 0.18 + fuelLitres * 0.25).toFixed(2);
    setEcoCommute((prev) => ({
      ...prev,
      distanceSlider: distanceKm,
      fuelSlider: fuelLitres,
      transportEmissionsKg: emissionsKg,
    }));
  };

  const logCommuteTrip = (tripData) => {
    const factor = tripData.mode.toLowerCase().includes('metro')
      ? 0.03
      : tripData.mode.toLowerCase().includes('ev')
      ? 0.05
      : tripData.mode.toLowerCase().includes('bus')
      ? 0.08
      : tripData.mode.toLowerCase().includes('walk') || tripData.mode.toLowerCase().includes('cycle')
      ? 0.0
      : 0.18;

    const emissions = +(tripData.distanceKm * factor).toFixed(2);
    const newTrip = {
      id: `TRIP-${Date.now().toString().slice(-4)}`,
      mode: tripData.mode,
      distanceKm: tripData.distanceKm,
      fuelType: tripData.fuelType,
      fuelLitres: tripData.fuelLitres || 0,
      emissionsKg: emissions,
      timestamp: 'Just now',
      route: tripData.route || 'Local Commute',
    };

    setEcoCommute((prev) => ({
      ...prev,
      todayKm: prev.todayKm + tripData.distanceKm,
      fuelBurnedLitres: +(prev.fuelBurnedLitres + (tripData.fuelLitres || 0)).toFixed(2),
      transportEmissionsKg: +(prev.transportEmissionsKg + emissions).toFixed(2),
      trips: [newTrip, ...prev.trips.slice(0, 9)],
    }));

    notify('Trip Recorded 🚗', `${tripData.mode} (${tripData.distanceKm} km) logged. +${emissions} kg CO₂e.`);

    // Friendly Chotu response
    addChotuReply(
      factor === 0
        ? `Bro, you walked or cycled ${tripData.distanceKm} km?! That is absolute legendary energy! +10 karma!`
        : factor <= 0.05
        ? `Bro, sweet choice with ${tripData.mode}! That barely added ${emissions} kg CO₂e. Keep it up!`
        : `Bro, ${tripData.distanceKm} km by ${tripData.mode} added ${emissions} kg CO₂e. Consider carpooling or Namma Metro next time!`
    );
  };

  // Spend Log Controls
  const addPurchase = (item) => {
    const newItem = {
      id: `SPL-${Date.now().toString().slice(-4)}`,
      item: item.item,
      category: item.category,
      embodiedKg: item.embodiedKg,
      isEco: item.isEco,
      priceInr: item.priceInr,
      date: 'Today',
      badge: item.isEco ? 'Eco Choice 🌿' : 'Standard ⚡',
    };
    setSpendLog((prev) => [newItem, ...prev]);
    notify('Purchase Added 🛍️', `${item.item} logged with ${item.embodiedKg} kg embodied carbon.`);

    if (item.isEco) {
      earnCredits(5.0, `Eco Purchase Bonus: ${item.item}`);
      addChotuReply(`Bro! Loving the eco purchase (${item.item})! Cleaned your balance and gave you +5 ₹-Credits!`);
    } else {
      addChotuReply(`Bro, noticed you logged ${item.item} (+${item.embodiedKg} kg CO₂e). Try checking Green Mart for circular alternatives!`);
    }
  };

  // Compost Nest Controls (AUTOMATED IOT SENSOR TELEMETRY)
  const depositWetWaste = (weightKg = 2.0, type = 'Kitchen green scraps') => {
    const methaneOffset = +(weightKg * 1.36).toFixed(2);
    const biogasKwh = +(weightKg * 1.63).toFixed(2);
    const creditReward = +(weightKg * 1.5).toFixed(1);

    setCompostNest((prev) => ({
      ...prev,
      wetWasteTodayKg: +(prev.wetWasteTodayKg + weightKg).toFixed(1),
      wetWasteMonthKg: +(prev.wetWasteMonthKg + weightKg).toFixed(1),
      compostMaturityPct: Math.min(100, prev.compostMaturityPct + 4),
      methaneOffsetKg: +(prev.methaneOffsetKg + methaneOffset).toFixed(2),
      biogasEquivalentKwh: +(prev.biogasEquivalentKwh + biogasKwh).toFixed(2),
      humidityPct: +(Math.min(75, prev.humidityPct + 1.2)).toFixed(1),
      soilMoisturePct: +(Math.min(70, prev.soilMoisturePct + 1.5)).toFixed(1),
      binFillPct: Math.min(100, prev.binFillPct + 5),
      lastSensorReading: 'Just now (Batch added)',
      recentDeposits: [
        {
          id: `DEP-${Date.now().toString().slice(-4)}`,
          weightKg,
          type,
          time: 'Just now',
        },
        ...prev.recentDeposits.slice(0, 5),
      ],
    }));

    earnCredits(creditReward, `Compost Nest Wet Waste Deposit (+${weightKg} kg)`);
    triggerConfetti();
    notify('Compost Nest Updated 🌿', `Logged ${weightKg} kg wet waste. Earned +${creditReward} ₹-Credits!`);
    addChotuReply(`Bro, awesome job on the compost today! +${creditReward} credits earned. Methane trapped: ${methaneOffset} kg!`);
  };

  const setCompostMaturity = (pct) => {
    setCompostNest((prev) => ({
      ...prev,
      compostMaturityPct: pct,
      daysToReady: Math.max(0, Math.ceil((100 - pct) / 5)),
    }));
  };

  // Wallet Controls
  const earnCredits = (amount, desc) => {
    setWallet((prev) => ({
      ...prev,
      totalCredits: +(prev.totalCredits + amount).toFixed(1),
      transactions: [
        {
          id: `TX-${Date.now().toString().slice(-4)}`,
          type: 'EARN',
          desc,
          credits: +amount,
          date: 'Just now',
        },
        ...prev.transactions.slice(0, 9),
      ],
    }));
  };

  const spendCredits = (amount, desc) => {
    if (wallet.totalCredits < amount) {
      notify('Insufficient ₹-Credits', 'Earn more green credits via Compost Nest or Power Pulse load shedding!', 'coral');
      return false;
    }
    setWallet((prev) => ({
      ...prev,
      totalCredits: +(prev.totalCredits - amount).toFixed(1),
      transactions: [
        {
          id: `TX-${Date.now().toString().slice(-4)}`,
          type: 'SPEND',
          desc,
          credits: -amount,
          date: 'Just now',
        },
        ...prev.transactions.slice(0, 9),
      ],
    }));
    return true;
  };

  const donateCredits = (amount, projectId, projectTitle) => {
    if (spendCredits(amount, `Micro-Donation: ${projectTitle}`)) {
      setImpactProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                raisedCredits: p.raisedCredits + amount,
                progressPct: Math.min(100, Math.round(((p.raisedCredits + amount) / p.targetCredits) * 100)),
              }
            : p
        )
      );
      triggerConfetti();
      notify('Karma Green Credit Sent 💚', `Donated ${amount} ₹-Credits to ${projectTitle}.`);
      addChotuReply(`Bro, you donated ${amount} credits to ${projectTitle}! That is pure karma gold! 🌟`);
    }
  };

  // Green Mart Purchase
  const buyGreenMartItem = (itemId) => {
    const item = greenMartItems.find((i) => i.id === itemId);
    if (!item) return;
    if (item.stock <= 0) {
      notify('Out of Stock', 'This artisan eco-batch is fully claimed!', 'coral');
      return;
    }

    if (spendCredits(item.priceCredits, `Green Mart: ${item.name}`)) {
      setGreenMartItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, stock: i.stock - 1 } : i))
      );
      triggerConfetti();
      notify('Item Purchased! 🎁', `Acquired ${item.name}! Offset bonus: -${item.carbonOffsetKg} kg CO₂e.`);
      addChotuReply(`Bro, excellent choice picking up ${item.name}! That cuts -${item.carbonOffsetKg} kg CO₂e from your footprint!`);
    }
  };

  // Carbon-Aware Smart Load Scheduler Actions
  const previewSmartSchedule = async () => {
    try {
      const res = await fetch('/api/scheduler/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_slot: scheduler.currentSlot || 14, currency: 'INR' }),
      });
      if (res.ok) {
        const data = await res.json();
        setScheduler((prev) => ({
          ...prev,
          summary: data.summary,
          jobs: data.jobs,
          timeline: data.timeline,
          currentSlot: data.current_slot,
          currentTime: data.current_time,
          isArmed: false,
        }));
        notify(
          'Smart Schedule Ready 🌱',
          `Projected savings: ₹${data.summary.savings.cost_saved} & ${data.summary.savings.carbon_saved_kg} kg CO₂e (100% on-time guarantee!)`,
          'mint'
        );
        addChotuReply(`Bro, I just analyzed grid carbon and tariffs! Shifting your EV Charger & Heat Pump to the solar window will save ₹${data.summary.savings.cost_saved} and cut ${data.summary.savings.carbon_saved_kg} kg CO₂e!`);
        return;
      }
    } catch (e) {
      console.warn('API scheduler preview fallback:', e);
    }
    // Fallback simulation update
    setScheduler((prev) => ({ ...prev, isArmed: false }));
    notify('Schedule Optimized 🌱', 'Saved ₹39.00 and avoided 4.36 kg CO₂e with Horn’s guarantee!', 'mint');
    addChotuReply('Bro, smart load scheduler is primed! Hit "Approve & Arm Dispatch" to synchronize with your NXP relay.');
  };

  const armSmartSchedule = async () => {
    try {
      await fetch('/api/scheduler/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'SIMULATION' }),
      });
    } catch (e) {
      console.warn('API scheduler execute fallback:', e);
    }
    setScheduler((prev) => ({ ...prev, isArmed: true }));
    triggerConfetti();
    notify('Schedule Armed & Active ⚡', 'NXP Smart Relay synchronized for solar window green dispatch.', 'mint');
    addChotuReply('Boom! 🚀 Schedule armed. Non-critical loads will run during peak solar and avoid dirty evening coal hours!');
  };

  const toggleSchedulerOverride = async () => {
    const nextOverride = !scheduler.manualOverride;
    try {
      await fetch('/api/scheduler/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ override: nextOverride, reason: 'User dashboard toggle' }),
      });
    } catch (e) {
      console.warn('API scheduler override fallback:', e);
    }
    setScheduler((prev) => ({ ...prev, manualOverride: nextOverride }));
    notify(
      nextOverride ? 'Safety Override Engaged ⚠️' : 'Safety Override Cleared 🛡️',
      nextOverride ? 'Automated load shifting halted. Manual control enforced.' : 'Smart scheduler resumed automated optimization.',
      nextOverride ? 'coral' : 'mint'
    );
    addChotuReply(
      nextOverride
        ? 'Safety override active! All automated switching paused. You have 100% manual control over the relays.'
        : 'Safety override cleared! Returning to automated carbon-aware scheduling.'
    );
  };

  // Chotu-Eco AI Assistant Helper
  const addChotuReply = (text) => {
    setChotuMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        sender: 'chotu',
        text,
        time: 'Just now',
      },
    ]);
  };

  const sendUserChotuMessage = (userText) => {
    if (!userText.trim()) return;
    setChotuMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: userText,
        time: 'Just now',
      },
    ]);

    // Intelligent Dynamic AI Advisor logic analyzing real-time data
    setTimeout(() => {
      const q = userText.toLowerCase();
      let reply = "Bro, I got your back! Check your Yagna Cycle Engine to see your Good vs Bad carbon ratio.";

      if (q.includes('ac') || q.includes('power') || q.includes('electricity') || q.includes('save') || q.includes('kwh')) {
        reply = `Bro, your house is pulling ${powerPulse.currentKwh} kW right now. Flip the Power Pulse Eco-Mode or turn on Load Shedding to instantly shave 1.4 kW peak demand and earn +8 credits!`;
      } else if (q.includes('commute') || q.includes('car') || q.includes('metro') || q.includes('travel') || q.includes('fuel')) {
        reply = `Bro, today you logged ${ecoCommute.todayKm} km with +${ecoCommute.transportEmissionsKg} kg CO₂e. Taking Namma Metro or an EV tomorrow would slash that by over 80%!`;
      } else if (q.includes('compost') || q.includes('waste') || q.includes('wet') || q.includes('soil')) {
        reply = `Bro, your Compost Nest is at ${compostNest.compostMaturityPct}% maturity with ${compostNest.humidityPct}% humidity. Aeration is optimal at 48°C thermophilic. You've suppressed ${compostNest.methaneOffsetKg} kg of methane!`;
      } else if (q.includes('credit') || q.includes('wallet') || q.includes('money') || q.includes('inr') || q.includes('ccts')) {
        reply = `Bro, you have ${wallet.totalCredits} ₹-Credits (worth ₹${wallet.totalCredits * 10} INR)! 70% (₹${Math.round(wallet.totalCredits * 7)}) is ready for direct UPI withdrawal, and 30% powers local green NGOs!`;
      } else if (q.includes('mart') || q.includes('buy') || q.includes('cooler') || q.includes('matka')) {
        reply = `Bro, definitely grab the Traditional Terracotta Matka Cooler from Green Mart! It saves 60W continuous fridge power and offsets 18.5 kg CO₂e!`;
      } else {
        reply = `Bro! You're sitting at ${yagnaAnalytics.isNetPositive ? 'a regenerative net positive balance (+ ' + yagnaAnalytics.goodCarbon + ' kg Good Carbon)' : 'a carbon deficit (' + yagnaAnalytics.badCarbon + ' kg Bad Carbon)'}. Let's get that offset higher!`;
      }

      addChotuReply(reply);
    }, 400);
  };

  // CRUCIAL: Global Dynamic Simulation Generator
  // SENSOR LOGIC RULE: Automated IoT Sensor Telemetry is strictly restricted to Compost Nest (weight, humidity, maturation).
  // ECO COMMUTE METRICS MUST REMAIN STATIC (no random commute jitter).
  const generateSampleActivity = () => {
    // 1. Power Pulse wattage fluctuation
    const wattageJitter = (Math.random() - 0.5) * 450;
    const newWatts = Math.max(1200, Math.min(4200, Math.round(hardware.liveWatts + wattageJitter)));
    const newKwh = +(newWatts / 1000).toFixed(2);

    setHardware((prev) => ({
      ...prev,
      liveWatts: newWatts,
      voltage: +(230 + (Math.random() - 0.5) * 3).toFixed(1),
      lastPingSecondsAgo: 1,
    }));

    setPowerPulse((prev) => ({
      ...prev,
      currentKwh: newKwh,
      carbonLoadKg: +(newKwh * prev.gridFactorKgPerKwh).toFixed(2),
    }));

    // 2. Compost Nest automated IoT progression
    setCompostNest((prev) => {
      const newMaturity = prev.compostMaturityPct >= 98 ? 40 : prev.compostMaturityPct + 2;
      const newHumidity = +(Math.max(50, Math.min(78, prev.humidityPct + (Math.random() - 0.5) * 2))).toFixed(1);
      const newTemp = +(Math.max(42, Math.min(54, prev.internalTempC + (Math.random() - 0.5) * 1.5))).toFixed(1);
      return {
        ...prev,
        compostMaturityPct: newMaturity,
        humidityPct: newHumidity,
        internalTempC: newTemp,
        methaneOffsetKg: +(prev.methaneOffsetKg + 0.25).toFixed(2),
        daysToReady: Math.max(0, Math.ceil((100 - newMaturity) / 5)),
        lastSensorReading: '1 sec ago (IoT stream)',
      };
    });

    // 3. Random credit trickle
    earnCredits(1.5, 'Dynamic IoT Telemetry Auto-Verification (+1.5 ₹-Credits)');

    notify(
      'Live IoT Telemetry Stream Injected ⚡',
      `Power: ${newWatts}W | Compost Nest: Temp ${compostNest.internalTempC}°C, Humidity ${compostNest.humidityPct}%`,
      'mint'
    );
  };

  // 1-Second Dynamic Heartbeat Interval for Yagna Cycle Engine and IoT live metrics
  const [liveSecondTick, setLiveSecondTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveSecondTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Interval timer for subtle live sensor heartbeat
  useEffect(() => {
    if (!autoSimulate || !hardware.connected) return;
    const interval = setInterval(() => {
      setHardware((prev) => {
        if (!prev.connected) return prev;
        const drift = Math.round((Math.random() - 0.5) * 90);
        return {
          ...prev,
          liveWatts: Math.max(1400, Math.min(3800, prev.liveWatts + drift)),
          voltage: +(230.5 + (Math.random() - 0.5) * 1.5).toFixed(1),
          lastPingSecondsAgo: 1,
        };
      });

      // Subtle IoT compost telemetry breath
      setCompostNest((prev) => ({
        ...prev,
        internalTempC: +(prev.internalTempC + (Math.random() - 0.5) * 0.1).toFixed(1),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [autoSimulate, hardware.connected]);

  // Derived Yagna Cycle Engine Analytics (re-evaluates every second and upon state updates)
  const yagnaAnalytics = useMemo(() => {
    // Bad Carbon = Power Pulse carbon + Eco Commute emissions + Spend Log embodied footprint
    const spendEmissions = spendLog.reduce((sum, item) => sum + item.embodiedKg, 0);
    const badCarbon = +(powerPulse.carbonLoadKg + ecoCommute.transportEmissionsKg + spendEmissions).toFixed(2);

    // Good Carbon = Compost Nest Methane Offset + Biogas Equivalent + Eco Purchases bonus + Biochar credit
    const ecoSavings = spendLog.filter((k) => k.isEco).length * 1.8;
    const goodCarbon = +(
      compostNest.methaneOffsetKg +
      compostNest.biogasEquivalentKwh * 0.45 +
      compostNest.biocharAddedKg * 0.35 +
      ecoSavings
    ).toFixed(2);

    const netCarbon = +(badCarbon - goodCarbon).toFixed(2);
    const isNetPositive = goodCarbon >= badCarbon;
    const netPercentage = badCarbon > 0 ? Math.round(((goodCarbon - badCarbon) / badCarbon) * 100) : 0;

    // AI Insight determination
    let aiInsight = 'Balanced footprint today. Maintain compost aeration to keep net offset stable.';
    if (netPercentage < 0) {
      if (powerPulse.carbonLoadKg > ecoCommute.transportEmissionsKg) {
        aiInsight = 'Bro, shift 1.2 kWh high-draw loads to solar noon or flip Power Pulse Eco Mode!';
      } else {
        aiInsight = 'Bro, switch your next commute to Namma Metro to wipe out 2.8 kg transport emissions!';
      }
    } else {
      aiInsight = `Awesome bro! Compost Nest is buffering ${compostNest.methaneOffsetKg} kg methane, keeping your mesh net-negative!`;
    }

    return {
      badCarbon,
      goodCarbon,
      netCarbon,
      isNetPositive,
      netPercentage,
      aiInsight,
      liveSecondTick,
      breakdown: {
        powerPulse: powerPulse.carbonLoadKg,
        ecoCommute: ecoCommute.transportEmissionsKg,
        spendLog: +spendEmissions.toFixed(2),
        compostNest: compostNest.methaneOffsetKg,
        biogas: +(compostNest.biogasEquivalentKwh * 0.45).toFixed(2),
        ecoPurchases: +ecoSavings.toFixed(2),
        // aliases
        urja: powerPulse.carbonLoadKg,
        gati: ecoCommute.transportEmissionsKg,
        kraya: +spendEmissions.toFixed(2),
        samputa: compostNest.methaneOffsetKg,
      },
    };
  }, [powerPulse, ecoCommute, spendLog, compostNest, liveSecondTick]);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        isAuthOpen,
        setIsAuthOpen,
        hardware,
        toggleHardwareConnection,
        toggleRelayLoadShed,
        // Carbon-Aware Smart Load Scheduler
        scheduler,
        previewSmartSchedule,
        armSmartSchedule,
        toggleSchedulerOverride,
        // Modern names
        powerPulse,
        toggleEcoMode,
        ecoCommute,
        updateEcoCommuteSliders,
        logCommuteTrip,
        spendLog,
        addPurchase,
        compostNest,
        depositWetWaste,
        setCompostMaturity,
        wallet,
        earnCredits,
        spendCredits,
        donateCredits,
        greenMartItems,
        buyGreenMartItem,
        impactProjects,
        activeCluster,
        setActiveCluster,
        clustersData,
        leaderboard: clustersData[activeCluster] || clustersData.saividya,
        autoSimulate,
        setAutoSimulate,
        generateSampleActivity,
        yagnaAnalytics,
        activeTab,
        setActiveTab,
        notification,
        triggerConfetti,
        // Chotu-Eco AI Buddy
        chotuMessages,
        isChotuOpen,
        setIsChotuOpen,
        sendUserChotuMessage,
        // Aliases for backward compatibility
        urja: powerPulse,
        gati: ecoCommute,
        kraya: spendLog,
        samputa: compostNest,
        haatItems: greenMartItems,
        buyHaatItem: buyGreenMartItem,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
