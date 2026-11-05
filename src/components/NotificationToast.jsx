import React from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const NotificationToast = () => {
  const { notification } = useApp();
  if (!notification) return null;

  const isCoral = notification.type === 'coral';
  const isAmber = notification.type === 'amber';

  return (
    <div className="fixed top-20 right-5 z-50 animate-bounce duration-300 pointer-events-none">
      <div
        className={`glass-panel rounded-2xl p-4 border max-w-sm shadow-2xl backdrop-blur-2xl flex items-start gap-3 ${
          isCoral
            ? 'border-brand-coral/40 bg-brand-coral/10 text-brand-coral shadow-glow-coral'
            : isAmber
            ? 'border-brand-amber/40 bg-brand-amber/10 text-brand-amber shadow-glow-amber'
            : 'border-brand-mint/40 bg-brand-mint/10 text-brand-mint shadow-glow-mint'
        }`}
      >
        <div className="mt-0.5">
          {isCoral ? (
            <AlertCircle className="w-5 h-5 text-brand-coral shrink-0" />
          ) : isAmber ? (
            <Info className="w-5 h-5 text-brand-amber shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 text-brand-mint shrink-0" />
          )}
        </div>
        <div>
          <h4 className="text-xs font-bold text-white mb-0.5">{notification.title}</h4>
          <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
            {notification.message}
          </p>
        </div>
      </div>
    </div>
  );
};
