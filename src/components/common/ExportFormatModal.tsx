import React, { useState } from 'react';
import { FileText, X, Check } from 'lucide-react';

export type ExportFormat = 'CSV' | 'EXCEL' | 'PDF' | 'PRINT';

interface ExportFormatModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  totalRecords?: number;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
}

export const ExportFormatModal: React.FC<ExportFormatModalProps> = ({
  isOpen,
  title = 'Select Export Format',
  description = 'Choose your preferred output format to download and process the data:',
  totalRecords,
  onClose,
  onExport,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('CSV');

  if (!isOpen) return null;

  const handleDownload = () => {
    onExport(selectedFormat);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 dark:border-emerald-800 space-y-4">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-100 dark:border-emerald-800 pb-3">
          <h3 className="font-extrabold text-emerald-950 dark:text-emerald-100 text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-700 dark:text-amber-400" />
            <span>{title}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-emerald-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-600 dark:text-emerald-300 font-medium">
          {description} {totalRecords !== undefined && <span className="font-extrabold text-emerald-800 dark:text-amber-300">({totalRecords} records)</span>}
        </p>

        {/* Format Choices Grid */}
        <div className="grid grid-cols-2 gap-3 py-1">
          {/* CSV Option */}
          <button
            type="button"
            onClick={() => setSelectedFormat('CSV')}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              selectedFormat === 'CSV'
                ? 'bg-emerald-50 dark:bg-emerald-900/80 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/20 text-emerald-950 dark:text-emerald-100 font-black'
                : 'bg-gray-50 dark:bg-emerald-900/30 border-gray-200 dark:border-emerald-800 text-gray-700 dark:text-emerald-300 font-bold hover:bg-gray-100 dark:hover:bg-emerald-900/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-extrabold">📄 CSV File</span>
              {selectedFormat === 'CSV' && <Check className="w-4 h-4 text-emerald-700 dark:text-amber-400" />}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-emerald-400 font-normal">Standard comma separated (.csv)</p>
          </button>

          {/* Excel Option */}
          <button
            type="button"
            onClick={() => setSelectedFormat('EXCEL')}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              selectedFormat === 'EXCEL'
                ? 'bg-emerald-50 dark:bg-emerald-900/80 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/20 text-emerald-950 dark:text-emerald-100 font-black'
                : 'bg-gray-50 dark:bg-emerald-900/30 border-gray-200 dark:border-emerald-800 text-gray-700 dark:text-emerald-300 font-bold hover:bg-gray-100 dark:hover:bg-emerald-900/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-extrabold">📊 Excel Sheet</span>
              {selectedFormat === 'EXCEL' && <Check className="w-4 h-4 text-emerald-700 dark:text-amber-400" />}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-emerald-400 font-normal">Formatted for Excel (.xlsx / .csv)</p>
          </button>

          {/* PDF Option */}
          <button
            type="button"
            onClick={() => setSelectedFormat('PDF')}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              selectedFormat === 'PDF'
                ? 'bg-emerald-50 dark:bg-emerald-900/80 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/20 text-emerald-950 dark:text-emerald-100 font-black'
                : 'bg-gray-50 dark:bg-emerald-900/30 border-gray-200 dark:border-emerald-800 text-gray-700 dark:text-emerald-300 font-bold hover:bg-gray-100 dark:hover:bg-emerald-900/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-extrabold">📕 PDF Document</span>
              {selectedFormat === 'PDF' && <Check className="w-4 h-4 text-emerald-700 dark:text-amber-400" />}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-emerald-400 font-normal">Printable PDF document report</p>
          </button>

          {/* Print Option */}
          <button
            type="button"
            onClick={() => setSelectedFormat('PRINT')}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              selectedFormat === 'PRINT'
                ? 'bg-emerald-50 dark:bg-emerald-900/80 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/20 text-emerald-950 dark:text-emerald-100 font-black'
                : 'bg-gray-50 dark:bg-emerald-900/30 border-gray-200 dark:border-emerald-800 text-gray-700 dark:text-emerald-300 font-bold hover:bg-gray-100 dark:hover:bg-emerald-900/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-extrabold">🖨️ Direct Print</span>
              {selectedFormat === 'PRINT' && <Check className="w-4 h-4 text-emerald-700 dark:text-amber-400" />}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-emerald-400 font-normal">Print direct physical copies / labels</p>
          </button>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-emerald-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-100 dark:bg-emerald-900 hover:bg-gray-200 dark:hover:bg-emerald-800 text-gray-700 dark:text-emerald-200 font-bold rounded-xl text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-extrabold rounded-xl shadow text-xs flex items-center gap-1.5"
          >
            Confirm & Download ({selectedFormat})
          </button>
        </div>

      </div>
    </div>
  );
};
