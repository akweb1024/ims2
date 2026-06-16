'use client';

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface SearchableFilterOption {
  value: string;
  label: string;
  hint?: string;
  meta?: string;
  disabled?: boolean;
}

interface SearchableFilterSelectProps {
  label: string;
  value: string;
  options: SearchableFilterOption[];
  onChange: (value: string) => void;
  placeholder: string;
  emptyLabel?: string;
  loading?: boolean;
  className?: string;
}

type DropdownPos = {
  top: number;
  left: number;
  width: number;
};

export default function SearchableFilterSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  emptyLabel = 'All',
  loading = false,
  className = '',
}: SearchableFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => (
      option.label.toLowerCase().includes(normalizedQuery)
      || option.hint?.toLowerCase().includes(normalizedQuery)
      || option.meta?.toLowerCase().includes(normalizedQuery)
      || option.value.toLowerCase().includes(normalizedQuery)
    ));
  }, [options, query]);

  const firstSelectableIndex = useMemo(
    () => filteredOptions.findIndex((option) => !option.disabled),
    [filteredOptions]
  );
  const listboxId = `${label.toLowerCase().replace(/\s+/g, '-')}-listbox`;

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 340;
    const openUp = window.innerHeight - rect.bottom < dropdownHeight && rect.top > window.innerHeight - rect.bottom;
    setDropdownPos({
      top: openUp ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handler = () => updatePosition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(() => {
      const selectedIndex = selectedOption ? filteredOptions.findIndex((option) => option.value === selectedOption.value && !option.disabled) : -1;
      return selectedIndex >= 0 ? selectedIndex : Math.max(firstSelectableIndex, 0);
    });
    const timeout = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timeout);
  }, [firstSelectableIndex, filteredOptions, open, selectedOption]);

  useEffect(() => {
    if (!open) return;
    if (query.trim() && firstSelectableIndex >= 0) {
      setActiveIndex(firstSelectableIndex);
    }
  }, [firstSelectableIndex, open, query]);

  useEffect(() => {
    if (!open) return;
    if (filteredOptions.length === 0) {
      setActiveIndex(0);
      return;
    }

    if (activeIndex >= filteredOptions.length) {
      setActiveIndex(Math.max(firstSelectableIndex, 0));
      return;
    }

    if (filteredOptions[activeIndex]?.disabled) {
      setActiveIndex(Math.max(firstSelectableIndex, 0));
    }
  }, [activeIndex, filteredOptions, firstSelectableIndex, open]);

  useEffect(() => {
    if (!open) return;
    const activeButton = optionRefs.current[activeIndex];
    activeButton?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const handleSelect = (option: SearchableFilterOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    setQuery('');
  };

  const moveActiveIndex = (direction: 1 | -1) => {
    if (!filteredOptions.length) return;
    let nextIndex = activeIndex;
    for (let i = 0; i < filteredOptions.length; i += 1) {
      nextIndex = (nextIndex + direction + filteredOptions.length) % filteredOptions.length;
      if (!filteredOptions[nextIndex]?.disabled) {
        setActiveIndex(nextIndex);
        return;
      }
    }
  };

  const selectActiveOption = () => {
    const option = filteredOptions[activeIndex];
    if (option && !option.disabled) {
      handleSelect(option);
    }
  };

  const openDropdown = () => {
    setOpen(true);
    setQuery('');
  };

  const closeDropdown = () => {
    setOpen(false);
    setQuery('');
    triggerRef.current?.focus();
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDropdown();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      openDropdown();
    }
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActiveIndex(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActiveIndex(-1);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      if (firstSelectableIndex >= 0) setActiveIndex(firstSelectableIndex);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      for (let i = filteredOptions.length - 1; i >= 0; i -= 1) {
        if (!filteredOptions[i]?.disabled) {
          setActiveIndex(i);
          break;
        }
      }
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      selectActiveOption();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDropdown();
    }
  };

  const clearValue = () => {
    onChange('');
    setQuery('');
  };

  const dropdown = open && dropdownPos ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/10"
      style={{
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
      }}
    >
      <div className="border-b border-slate-200 bg-slate-50/90 p-3">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
          <Search size={14} className="text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            onKeyDown={onInputKeyDown}
            aria-autocomplete="list"
            aria-controls={listboxId}
            className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-72 overflow-auto p-2">
        {loading ? (
          <div className="px-4 py-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Loading options...
          </div>
        ) : filteredOptions.length > 0 ? (
          <ul id={listboxId} role="listbox" className="space-y-1">
            {filteredOptions.map((option, optionIndex) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value} role="presentation">
                  <button
                    ref={(node) => {
                      optionRefs.current[optionIndex] = node;
                    }}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setActiveIndex(optionIndex)}
                    disabled={option.disabled}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    className={`flex w-full items-start justify-between gap-4 rounded-2xl px-3 py-2.5 text-left transition ${
                      option.disabled
                        ? 'cursor-not-allowed opacity-50'
                        : optionIndex === activeIndex
                          ? 'bg-slate-100'
                          : isSelected
                          ? 'bg-slate-950 text-white'
                          : 'hover:bg-slate-100'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{option.label}</span>
                      {(option.hint || option.meta) && (
                        <span className={`mt-0.5 block text-[11px] ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                          {option.hint || option.meta}
                        </span>
                      )}
                    </span>
                    {isSelected && <Check size={15} className="mt-0.5 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-4 py-8 text-center">
            <div className="text-sm font-semibold text-slate-900">No matches found</div>
            <div className="mt-1 text-xs text-slate-500">Try a different keyword.</div>
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">{label}</span>
        {value && (
          <button
            type="button"
            onClick={clearValue}
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 transition hover:text-slate-700"
          >
            Clear
          </button>
        )}
      </div>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label} selector`}
        className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        <Search size={14} className="shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-semibold ${selectedOption ? 'text-slate-950' : 'text-slate-400'}`}>
            {selectedOption?.label || emptyLabel}
          </span>
          <span className="block truncate text-[11px] font-medium text-slate-500">
            {selectedOption?.hint || placeholder}
          </span>
        </span>
        <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {selectedOption ? 'Selected' : 'Choose'}
          <ChevronDown size={14} />
        </span>
      </button>

      {dropdown}
    </div>
  );
}
