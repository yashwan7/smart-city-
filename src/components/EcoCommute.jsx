import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Car,
  Navigation,
  Fuel,
  PlusCircle,
  Train,
  Bike,
  Activity,
  Footprints,
  Calendar,
  CheckCircle2,
  Info,
} from 'lucide-react';

export const EcoCommute = () => {
  const { ecoCommute, logCommuteTrip } = useApp();
  const [isLogging, setIsLogging] = useState(false);
  const [newMode, setNewMode] = useState('Namma Metro');
  const [newDistance, setNewDistance] = useState(12);
  const [customRoute, setCustomRoute] = useState('Campus Corridor');

  const handleQuickLog = (e) => {
    e.preventDefault();
    const dist = parseFloat(newDistance) || 0;
    if (dist <= 0) return;

    const isCar = newMode.includes('Petrol Car') || newMode.includes('Diesel');
    const fuelCalc = isCar ? +(dist * 0.08).toFixed(2) : 0;

    logCommuteTrip({
      mode: newMode,
      distanceKm: dist,
      fuelType: isCar ? 'Petrol' : newMode.includes('EV') ? 'EV Clean Charge' : 'Mass Transit',
      fuelLitres: fuelCalc,
      route: customRoute.trim() || 'City Corridor Commute',
    });
    setIsLogging(false);
  };

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/10 relative overflow-hidden">
      {/* Ambient background lighting */}
      <div className="absolute top-0 right-0 w-72 h-72 ambient-coral pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-coral/10 border border-brand-coral/30 flex items-center justify-center text-brand-coral shadow-glow-coral">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold text-white">Eco Commute</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-coral/15 text-brand-coral border border-brand-coral/25 font-semibold">
                Vehicle & Transit Tracker
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Manual commute logging & static verified fuel consumption metrics
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsLogging(!isLogging)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all shadow-glass"
        >
          <PlusCircle className="w-3.5 h-3.5 text-brand-mint" />
          <span>{isLogging ? 'Close Form' : 'Log Daily Commute'}</span>
        </button>
      </div>

      {/* Manual Commute Logger Form */}
      {isLogging && (
        <form
          onSubmit={handleQuickLog}
          className="p-5 rounded-2xl bg-canvas-dark/90 border border-brand-mint/40 mb-6 space-y-4 shadow-glass"
        >
          <div className="flex items-center justify-between text-xs font-bold text-brand-mint">
            <span>Manual Trip Logger (Static Verification)</span>
            <span className="text-slate-400 text-[10px]">Zero automatic jitter • Strictly user logged</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Vehicle / Transit Mode</label>
              <select
                value={newMode}
                onChange={(e) => setNewMode(e.target.value)}
                className="w-full bg-canvas-card border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-mint font-medium"
              >
                <option value="Namma Metro">Namma Metro (0.03 kg/km)</option>
                <option value="Electric Two-Wheeler">Electric Two-Wheeler (0.05 kg/km)</option>
                <option value="Electric Bus / BMTC">BMTC Electric Bus (0.08 kg/km)</option>
                <option value="Walking / Bicycle">Walking or Bicycle (0.00 kg/km)</option>
                <option value="Petrol Car">Petrol Car (0.18 kg/km + Fuel)</option>
                <option value="Diesel SUV">Diesel SUV (0.24 kg/km + Fuel)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Distance Traveled (KM)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="200"
                value={newDistance}
                onChange={(e) => setNewDistance(e.target.value)}
                className="w-full bg-canvas-card border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-mint font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Route / Trip Note</label>
              <input
                type="text"
                placeholder="e.g. Hebbal to Whitefield"
                value={customRoute}
                onChange={(e) => setCustomRoute(e.target.value)}
                className="w-full bg-canvas-card border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-mint"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-[11px] text-slate-400">
              Estimated Emission Impact:{' '}
              <strong className="text-brand-coral font-mono">
                +{(newDistance * (newMode.includes('Metro') ? 0.03 : newMode.includes('Electric') ? 0.05 : newMode.includes('Walk') ? 0 : 0.18)).toFixed(2)} kg CO₂e
              </strong>
            </span>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-brand-mint text-canvas-dark font-extrabold text-xs hover:brightness-110 shadow-glow-mint transition-all"
            >
              Record Trip in Ledger
            </button>
          </div>
        </form>
      )}

      {/* Primary Metrics Row (STATIC - Never jittered automatically) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
          <span className="text-xs text-slate-400 font-medium block mb-1">Total Distance Today</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl lg:text-3xl font-display font-extrabold text-white">
              {ecoCommute.todayKm}
            </span>
            <span className="text-xs font-semibold text-brand-coral">KM</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Static verified odometer mileage
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
          <span className="text-xs text-slate-400 font-medium block mb-1">Fuel Burned</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl lg:text-3xl font-display font-extrabold text-white">
              {ecoCommute.fuelBurnedLitres}
            </span>
            <span className="text-xs font-semibold text-brand-amber">Litres</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Static fuel metrics (no sensor jitter)
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-brand-coral/10 border border-brand-coral/20">
          <span className="text-xs text-brand-coral font-medium block mb-1">Transport Carbon Footprint</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl lg:text-3xl font-display font-extrabold text-brand-coral">
              {ecoCommute.transportEmissionsKg}
            </span>
            <span className="text-xs font-semibold text-brand-coral">kg CO₂e</span>
          </div>
          <span className="text-[11px] text-slate-300 mt-1 block">
            MoEFCC transport factor
          </span>
        </div>
      </div>

      {/* Trip History Table */}
      <div className="p-4 rounded-2xl bg-canvas-dark/60 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-brand-coral" />
            Verified Manual Trip History
          </span>
          <span className="text-[11px] text-slate-400">Latest recorded entries</span>
        </div>

        <div className="space-y-2">
          {ecoCommute.trips.map((trip) => (
            <div
              key={trip.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs flex-wrap gap-2"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-300">
                  {trip.mode.includes('Metro') ? (
                    <Train className="w-4 h-4 text-brand-mint" />
                  ) : trip.mode.includes('Two-Wheeler') ? (
                    <Bike className="w-4 h-4 text-brand-sky" />
                  ) : (
                    <Car className="w-4 h-4 text-brand-coral" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-white block">{trip.route}</span>
                  <span className="text-[10px] text-slate-400">
                    {trip.mode} • {trip.fuelType}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono text-slate-300">{trip.distanceKm} km</span>
                <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-brand-coral/15 text-brand-coral border border-brand-coral/25">
                  +{trip.emissionsKg} kg CO₂e
                </span>
                <span className="text-[10px] text-slate-500">{trip.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export const GatiMeter = EcoCommute;

