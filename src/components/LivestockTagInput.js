import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '../utils/api';

// ---------------------------------------------------------------------------
// LivestockTagInput
// ---------------------------------------------------------------------------
// A production-grade searchable autocomplete component for livestock tag_id
// lookup. Used across every module that references an animal identifier:
//   - Live Stock (tag)
//   - Crossing Log, Sale Log (tag)
//   - Health: Treatment Log, Vaccination Log (tagId)
//   - Milk Production: Daily Milk Collection (tagId)
//   - Inventory: Daily Feeding (animalId)
//
// Props:
//   name          {string}   - form field name ('tag', 'tagId', 'animalId', …)
//   value         {string}   - controlled value from parent form state
//   onChange      {function} - called with (name, tagValue, animalRecord | null)
//   onValidation  {function} - called with (isValid: boolean, message: string)
//   required      {boolean}
//   disabled      {boolean}
//   placeholder   {string}
//   validationMode {string}  - 'must_exist' | 'must_not_exist' | 'none'
//                              'must_exist'     → tag must be in active livestock (default)
//                              'must_not_exist' → tag must NOT already exist (Purchase Log)
//                              'none'           → no livestock validation (free-text)
//   filterFn      {function} - optional (animal) => boolean to pre-filter dropdown list
//   livestockList {Array}    - optional externally provided list (skip internal fetch)
// ---------------------------------------------------------------------------

const CACHE_KEY = '__livestock_tag_cache__';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** @returns {{ list: Array, ts: number } | null} */
function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** @param {Array} list */
function writeCache(list) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ list, ts: Date.now() }));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Normalise a raw API animal record to a flat tag object.
 * Handles both LiveStock (tag_id) and legacy Cattle (tag) schemas.
 * @param {Record<string, any>} r
 * @returns {{ tag_id: string, display: string, status: string, gender: string, animalType: string, shed: string, raw: Record<string, any> }}
 */
function normaliseAnimal(r) {
  const tag_id = String(r.tag_id || r.tag || '').trim().toUpperCase();
  const animalType = String(r.animalType || r.cattleType || '').toUpperCase();
  const status = String(r.status || 'ACTIVE').toUpperCase();
  const gender = String(r.gender || '').toLowerCase();
  const shed = String(r.shed || r.shedId || '-');
  const breed = String(r.breed || '');
  const display = [tag_id, animalType, breed].filter(Boolean).join(' · ');
  return { tag_id, display, status, gender, animalType, shed, raw: r };
}

const LivestockTagInput = ({
  name,
  value = '',
  onChange,
  onValidation,
  required = false,
  disabled = false,
  placeholder = 'Type or scan Tag ID...',
  validationMode = 'must_exist',
  filterFn = null,
  livestockList = null,
}) => {
  const [inputValue, setInputValue] = useState(String(value || '').toUpperCase());
  const [allAnimals, setAllAnimals] = useState(() => {
    if (livestockList !== null) {
      return (Array.isArray(livestockList) ? livestockList : []).map(normaliseAnimal);
    }
    const cached = readCache();
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS && Array.isArray(cached.list) && cached.list.length > 0) {
      return cached.list.map(normaliseAnimal);
    }
    return [];
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationState, setValidationState] = useState('idle'); // 'idle' | 'valid' | 'invalid'
  const [validationMsg, setValidationMsg] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const [prevValue, setPrevValue] = useState(value);
  const [prevLivestockList, setPrevLivestockList] = useState(livestockList);

  // Sync external value prop → input (e.g. when form is reset)
  if (value !== prevValue) {
    setPrevValue(value);
    const normalised = String(value || '').toUpperCase();
    if (normalised !== inputValue) {
      setInputValue(normalised);
    }
  }

  // Sync external livestockList prop → allAnimals
  if (livestockList !== prevLivestockList) {
    setPrevLivestockList(livestockList);
    if (livestockList !== null) {
      setAllAnimals((Array.isArray(livestockList) ? livestockList : []).map(normaliseAnimal));
    }
  }

  // ── Close dropdown on outside click ───────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Fetch livestock list once on mount ────────────────────────────────────
  useEffect(() => {
    if (livestockList !== null) return;

    // If already initialized from cache, skip API fetch
    if (allAnimals.length > 0) return;

    setIsLoading(true);
    api.cattle.getAll()
      .then((res) => {
        const raw = Array.isArray(res) ? res : (res?.data ?? []);
        const normalised = raw.map(normaliseAnimal);
        setAllAnimals(normalised);
        writeCache(raw);
      })
      .catch((err) => {
        console.error('[LivestockTagInput] Failed to fetch livestock:', err);
        // Fall back to sessionStorage if API call fails (firewall-blocked, offline, etc.)
        const cached = readCache();
        if (cached && Array.isArray(cached.list)) {
          setAllAnimals(cached.list.map(normaliseAnimal));
        }
      })
      .finally(() => setIsLoading(false));
  }, [livestockList, allAnimals.length]);

  // ── Validate the current input value against the livestock pool ───────────
  const validate = useCallback((rawInput, animals) => {
    const val = String(rawInput || '').trim().toUpperCase();

    if (validationMode === 'none' || val === '') {
      setValidationState('idle');
      setValidationMsg('');
      onValidation?.(true, '');
      return;
    }

    const match = animals.find((a) => {
      if (a.tag_id !== val) return false;
      if (typeof filterFn === 'function') {
        return filterFn(a);
      }
      return true;
    });

    if (validationMode === 'must_not_exist') {
      if (match) {
        const msg = 'animal already exist';
        setValidationState('invalid');
        setValidationMsg(msg);
        onValidation?.(false, msg);
      } else {
        setValidationState('valid');
        setValidationMsg('');
        onValidation?.(true, '');
      }
      return;
    }

    // validationMode === 'must_exist' (default)
    if (!match) {
      const msg = 'Access Denied: This animal must first be fully registered inside the Live Stock entrypoint module before logs can be processed.';
      setValidationState('invalid');
      setValidationMsg(msg);
      onValidation?.(false, msg);
    } else if (['SOLD', 'DECEASED', 'DEAD'].includes(match.status)) {
      const msg = `Animal status is "${match.status}" — inactive animals are not permitted.`;
      setValidationState('invalid');
      setValidationMsg(msg);
      onValidation?.(false, msg);
    } else {
      setValidationState('valid');
      setValidationMsg('');
      onValidation?.(true, '');
    }
  }, [validationMode, onValidation, filterFn]);

  // ── Filter dropdown list as user types ────────────────────────────────────
  const filtered = useMemo(() => {
    if (!inputValue) {
      return [];
    }
    const query = inputValue.trim().toUpperCase();
    let results = allAnimals.filter((a) => a.tag_id.includes(query));

    // Apply optional caller-provided filter (e.g. female-only for Crossing Log)
    if (typeof filterFn === 'function') {
      results = results.filter(filterFn);
    }

    return results.slice(0, 12); // cap dropdown to 12 items
  }, [inputValue, allAnimals, filterFn]);

  // ── Handle input change ───────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const raw = e.target.value.toUpperCase();
    setInputValue(raw);
    setIsOpen(raw.length > 0);
    onChange?.(name, raw, null);

    // Validate on every keystroke only if non-empty
    if (raw.length > 0) {
      validate(raw, allAnimals);
    } else {
      setValidationState('idle');
      setValidationMsg('');
      onValidation?.(true, '');
    }
  };

  // ── Handle selection from dropdown ────────────────────────────────────────
  const handleSelect = (animal) => {
    setInputValue(animal.tag_id);
    setIsOpen(false);
    validate(animal.tag_id, allAnimals);
    onChange?.(name, animal.tag_id, animal.raw);
  };

  const borderClass = {
    idle:    'border-slate-200 focus:border-[#D1867D] focus:ring-[#D1867D]/10',
    valid:   'border-emerald-400 ring-2 ring-emerald-400/20 focus:border-emerald-500',
    invalid: 'border-amber-500 ring-2 ring-red-500/20 focus:border-red-600 focus:ring-red-600/10 bg-red-50/10 text-red-950 font-bold',
  }[validationState];

  return (
    <div ref={wrapperRef} className="relative">
      {/* ── Text Input ──────────────────────────────────────────────────── */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue.length > 0 && filtered.length > 0 && setIsOpen(true)}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={`mt-1 block w-full border rounded-xl p-2.5 pr-9 text-black outline-none transition-all duration-200 font-mono text-sm tracking-wide ${borderClass} ${
            disabled ? 'bg-slate-50 cursor-not-allowed text-slate-400' : 'bg-white'
          }`}
        />

        {/* Loading spinner / validation icon */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none mt-0.5">
          {isLoading
            ? <span className="text-slate-300 animate-pulse">⏳</span>
            : validationState === 'valid'
            ? <span className="text-emerald-500">✓</span>
            : validationState === 'invalid'
            ? <span className="text-red-500">✗</span>
            : <span className="text-slate-300">🔍</span>
          }
        </span>
      </div>

      {/* ── Validation message ───────────────────────────────────────────── */}
      {validationMsg && (
        <p className="mt-1.5 text-xs font-bold text-red-500 flex items-center gap-1">
          <span>⚠️</span>
          {validationMsg}
        </p>
      )}

      {/* ── Dropdown ────────────────────────────────────────────────────── */}
      {isOpen && filtered.length > 0 && !disabled && (
        <ul
          className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[200] overflow-hidden"
          style={{ maxHeight: '220px', overflowY: 'auto' }}
        >
          {filtered.map((animal) => (
            <li
              key={animal.tag_id}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(animal); }}
              className={`px-4 py-2.5 cursor-pointer flex items-center justify-between gap-3 hover:bg-[#f0f4f8] transition-colors border-b border-slate-50 last:border-b-0 ${
                ['SOLD', 'DECEASED', 'DEAD'].includes(animal.status) ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div className="flex flex-col min-w-0">
                <span className="font-black text-[#071437] text-sm tracking-wide font-mono">
                  {animal.tag_id}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 truncate">
                  {animal.animalType}{animal.shed && animal.shed !== '-' ? ` · Shed ${animal.shed}` : ''}
                </span>
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border flex-shrink-0 ${
                !['SOLD', 'DECEASED', 'DEAD'].includes(animal.status)
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {animal.status}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* ── Empty state hint when user typed but nothing matches ────────── */}
      {isOpen && inputValue.length >= 2 && filtered.length === 0 && !isLoading && validationMode === 'must_exist' && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-red-200 rounded-2xl shadow-lg z-[200] px-4 py-3 text-xs font-bold text-red-500 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className="font-extrabold text-red-600">Access Denied</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 leading-normal">
            This animal must first be fully registered inside the Live Stock entrypoint module before logs can be processed.
          </p>
        </div>
      )}
    </div>
  );
};

export default LivestockTagInput;
