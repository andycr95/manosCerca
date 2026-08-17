"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SelectOption = { value: string; label: string; group?: string };

type SearchableSelectProps = {
  label: string;
  placeholder: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  description?: string;
  emptyMessage?: string;
  className?: string;
  hideLabel?: boolean;
};

export function SearchableSelect({ label, placeholder, value, options, onChange, required = false, disabled = false, description, emptyMessage = "No encontramos resultados.", className, hideLabel = false }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const selected = options.find((option) => option.value === value);
  const results = useMemo(() => options.filter((option) => option.label.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es"))), [options, query]);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!panelRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return <div className={`search-select ${className ?? ""}`} ref={panelRef}>
    <span className={`search-select-label${hideLabel ? " sr-only" : ""}`} id={`${inputId}-label`}>{label}{required && <b> *</b>}</span>
    <button type="button" className="search-select-trigger" aria-labelledby={`${inputId}-label`} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => { if (!open) setQuery(""); setOpen(!open); }}><span className={selected ? "selected-value" : "placeholder-value"}>{selected?.label ?? placeholder}</span><span className="select-chevron">⌄</span></button>
    {description && <small>{description}</small>}
    {open && <div className="search-select-menu"><label className="search-select-input"><span>⌕</span><input id={inputId} autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} placeholder={`Buscar ${label.toLocaleLowerCase("es")}…`} /></label><div className="search-select-options" role="listbox" aria-labelledby={`${inputId}-label`}>{results.length === 0 ? <p className="search-select-empty">{emptyMessage}</p> : results.map((option, index) => <div key={option.value}>{option.group && (index === 0 || results[index - 1].group !== option.group) && <p className="search-select-group">{option.group}</p>}<button type="button" role="option" aria-selected={value === option.value} className={value === option.value ? "active" : ""} onClick={() => { onChange(option.value); setOpen(false); }}>{value === option.value && <span>✓</span>}{option.label}</button></div>)}</div></div>}
  </div>;
}
