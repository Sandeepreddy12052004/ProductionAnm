import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ConfirmDialog = ({ isOpen, title = "Delete Record", message = "Are you sure you want to permanently delete this record? This action cannot be undone.", onConfirm, onCancel }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#16223F]/40 backdrop-blur-sm flex items-center justify-center z-[250] p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-100 flex flex-col items-center text-center"
          >
            {/* Warning Icon Container */}
            <div className="w-14 h-14 rounded-full bg-brand-rose/10 border border-brand-rose/20 flex items-center justify-center text-brand-rose text-2xl mb-4 shadow-sm">
              ⚠️
            </div>

            {/* Title */}
            <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">
              {title}
            </h3>

            {/* Message */}
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
              {message}
            </p>

            {/* Buttons */}
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 h-12 bg-brand-rose hover:bg-brand-rose/90 text-white rounded-xl font-bold transition-all duration-200 active:scale-95 text-sm shadow-lg shadow-brand-rose/15"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all duration-200 active:scale-95 text-sm"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
