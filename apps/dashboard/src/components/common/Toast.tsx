import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Toast: React.FC = () => {
  const { toastMessage } = useApp();

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          id="app-toast-container"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50 max-w-md shadow-2xl rounded-xl overflow-hidden pointer-events-auto"
        >
          <div
            className={`flex items-start gap-3 p-4 border backdrop-blur-md ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-100 border-emerald-500/50'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/90 text-rose-100 border-rose-500/50'
                : toastMessage.type === 'warning'
                ? 'bg-amber-950/90 text-amber-100 border-amber-500/50'
                : 'bg-slate-900/90 text-slate-100 border-slate-700'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            {toastMessage.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
            {toastMessage.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}
            <div className="text-sm font-medium leading-relaxed">{toastMessage.text}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
