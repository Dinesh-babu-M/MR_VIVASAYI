import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { COUNTRIES, CountryInfo, getCountryByCode } from '../../lib/countryCodes';

interface CountrySelectorProps {
  value: string; // Country ISO code (e.g. 'IN')
  onChange: (country: CountryInfo) => void;
  disabled?: boolean;
  className?: string;
  showCallingCode?: boolean;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  showCallingCode = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCountry = getCountryByCode(value);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredCountries = COUNTRIES.filter(c => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.callingCode.includes(q)
    );
  });

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-1.5 px-2.5 py-2 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-emerald-100 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/50 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
        title={`${selectedCountry.name} (${selectedCountry.callingCode})`}
      >
        <span className="text-base leading-none select-none">{selectedCountry.flag}</span>
        {showCallingCode && (
          <span className="font-mono text-emerald-800 dark:text-amber-300 font-bold">
            {selectedCountry.callingCode}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
          {/* Search Header */}
          <div className="p-2 border-b border-emerald-100 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-900/40">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search country or code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-lg text-gray-800 dark:text-emerald-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Countries List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-emerald-50 dark:divide-emerald-900/50">
            {filteredCountries.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-400">
                No country found
              </div>
            ) : (
              filteredCountries.map(country => {
                const isSelected = country.code === selectedCountry.code;
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => {
                      onChange(country);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition hover:bg-emerald-50 dark:hover:bg-emerald-900/60 ${
                      isSelected ? 'bg-emerald-100/60 dark:bg-emerald-800/50 font-bold text-emerald-950 dark:text-emerald-100' : 'text-gray-700 dark:text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-lg leading-none select-none">{country.flag}</span>
                      <span className="truncate">{country.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <span className="font-mono text-xs text-emerald-700 dark:text-amber-300 font-bold">
                        {country.callingCode}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountrySelector;
