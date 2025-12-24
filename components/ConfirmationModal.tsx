import React from 'react';
import { AlertTriangle, XCircle, Trash2, LogOut } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  message: string;
  title: string;
  confirmText: string;
  variant: 'danger' | 'primary' | 'logout';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, message, title, confirmText, variant, onConfirm, onCancel 
}) => {
  if (!isOpen) return null;

  // Determine styles and icon based on variant
  let icon = <Trash2 size={24} />;
  let headerBg = "bg-red-100 text-red-600";
  let btnClass = "bg-red-600 hover:bg-red-700";
  
  if (variant === 'logout') {
      icon = <LogOut size={24} />;
      headerBg = "bg-slate-100 text-slate-700";
      btnClass = "bg-slate-800 hover:bg-slate-900";
  } else if (variant === 'primary') {
      icon = <AlertTriangle size={24} />;
      headerBg = "bg-teal-100 text-teal-600";
      btnClass = "bg-teal-600 hover:bg-teal-700";
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-slate-800 animate-in zoom-in-95 fade-in duration-200 border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${headerBg}`}>
                {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          </div>
          <button 
            type="button" 
            onClick={onCancel} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            <XCircle size={24} />
          </button>
        </div>
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
            {message}
            </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-bold transition-all shadow-sm"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all shadow-md flex items-center gap-2 ${btnClass}`}
          >
            {variant === 'logout' ? <LogOut size={16} /> : (variant === 'danger' ? <Trash2 size={16} /> : null)}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;