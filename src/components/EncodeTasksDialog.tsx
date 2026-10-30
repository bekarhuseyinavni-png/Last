import React from 'react';
import { EncodeTask } from '../types';
import { Film, CheckCircle2, Clock, Play, Download, Trash2, X } from 'lucide-react';

interface EncodeTasksDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: EncodeTask[];
  onPlayTask?: (url: string) => void;
  onDeleteTask?: (id: string) => void;
}

export const EncodeTasksDialog: React.FC<EncodeTasksDialogProps> = ({
  isOpen,
  onClose,
  tasks,
  onPlayTask,
  onDeleteTask,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#141721] border border-indigo-500/30 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-indigo-500/20 flex items-center justify-between bg-[#1E2333]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Encode Görev Kuyruğu</h2>
              <p className="text-xs text-slate-400">{tasks.length} toplam görev</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task List */}
        <div className="p-6 flex-1 overflow-y-auto space-y-3">
          {tasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Henüz kaydedilmiş bir hardsub encode görevi yok.
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-xl border border-slate-800 bg-[#0C0E14] flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-white truncate">{task.title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        task.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : task.status === 'ENCODING'
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {task.status === 'COMPLETED' ? 'Tamamlandı' : task.status === 'ENCODING' ? 'Kodlanıyor' : task.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span>{task.quality}</span>
                    <span>•</span>
                    <span>{task.resolution}</span>
                    <span>•</span>
                    <span>{new Date(task.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {task.status === 'COMPLETED' && task.outputVideoUrl && (
                    <button
                      onClick={() => onPlayTask?.(task.outputVideoUrl!)}
                      className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 transition"
                      title="Videoyu Oynat"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  )}
                  {onDeleteTask && (
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition"
                      title="Görevi Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 flex justify-end bg-[#1E2333]/20">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
