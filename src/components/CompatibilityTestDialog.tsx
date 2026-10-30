import React, { useState } from 'react';
import { CompatibilityTestItem } from '../types';
import { runCompatibilityTest } from '../services/hardsubEncoder';
import { CheckCircle2, AlertTriangle, RefreshCw, X, Cpu } from 'lucide-react';

interface CompatibilityTestDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompatibilityTestDialog: React.FC<CompatibilityTestDialogProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<CompatibilityTestItem[]>(() => runCompatibilityTest());

  if (!isOpen) return null;

  const handleRerun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setTestResults(runCompatibilityTest());
      setIsRunning(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#141721] border border-indigo-500/30 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-indigo-500/20 flex items-center justify-between bg-[#1E2333]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Donanım & FFmpeg Uyumluluk Testi</h2>
              <p className="text-xs text-slate-400">Video kodlayıcı ve altyazı motoru sistem kontrolleri</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-6 flex-1 overflow-y-auto space-y-3">
          {testResults.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-800 bg-[#1E2333]/30 hover:border-indigo-500/30 transition flex items-start gap-3.5"
            >
              <div className="mt-0.5">
                {item.isOk ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.isOk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {item.statusText}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.details}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-[#1E2333]/20">
          <button
            onClick={handleRerun}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-sm font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Test Ediliyor...' : 'Testi Tekrar Çalıştır'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 transition"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
