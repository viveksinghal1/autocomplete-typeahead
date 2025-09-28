// Autocomplete.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Simple LRU cache */
class LRUCache<V> {
  private max: number;
  private map = new Map<string, { v: V; time: number }>();
  private ttlMs?: number;
  constructor(max = 100, ttlMs?: number) { this.max = max; this.ttlMs = ttlMs; }
  get(k: string): V | undefined {
    const entry = this.map.get(k);
    if (!entry) return undefined;
    if (this.ttlMs && (Date.now() - entry.time > this.ttlMs)) {
      this.map.delete(k);
      return undefined;
    }
    this.map.delete(k);
    this.map.set(k, entry);
    return entry.v;
  }
  set(k: string, v: V) {
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, { v, time: Date.now() });
    while (this.map.size > this.max) {
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
  }
  has(k: string) { return this.get(k) !== undefined; }
}

/** Types */
export type Suggestion = {
  id: string;
  label: string;
  sub?: string;
  // any other metadata
};

type AutocompleteProps = {
  fetchSuggestions: (q: string, signal?: AbortSignal) => Promise<Suggestion[]>;
  minChars?: number;
  debounceMs?: number;
  placeholder?: string;
  onSelect?: (s: Suggestion) => void;
  cacheSize?: number;
  cacheTTLms?: number;
  renderSuggestion?: (s: Suggestion, highlighted: boolean) => React.ReactNode;
};

export default function Autocomplete({
  fetchSuggestions,
  minChars = 1,
  debounceMs = 200,
  placeholder = "Search",
  onSelect,
  cacheSize = 200,
  cacheTTLms = 5 * 60 * 1000,
  renderSuggestion,
}: AutocompleteProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const controllerRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const cache = useMemo(() => new LRUCache<Suggestion[]>(cacheSize, cacheTTLms), [cacheSize, cacheTTLms]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = useRef(`autocomplete-list-${Math.random().toString(36).slice(2, 9)}`);
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => () => { mounted.current = false; }, []);

  const doFetch = useCallback(async (q: string) => {
    if (!q || q.length < minChars) {
      setItems([]);
      setLoading(false);
      return;
    }

    const cacheKey = q.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached) {
      setItems(cached);
      setLoading(false);
      return;
    }

    // Cancel previous
    if (controllerRef.current) controllerRef.current.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;
    setLoading(true);

    try {
      const results = await fetchSuggestions(q, ctrl.signal);
      console.log('results', JSON.stringify(results));
    //   if (!mounted.current) return;
      cache.set(cacheKey, results);
      setItems(results);
      console.log('items', items);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // expected cancel
      } else {
        console.error("fetchSuggestions error", err);
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [fetchSuggestions, minChars, cache]);

  // Debounced query effect
  useEffect(() => {
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    if (!query || query.length < minChars) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    debounceTimer.current = window.setTimeout(() => {
      doFetch(query);
      setOpen(true);
      setActiveIndex(-1);
    }, debounceMs);
    return () => { if (debounceTimer.current) window.clearTimeout(debounceTimer.current); };
  }, [query, debounceMs, doFetch, minChars]);

  // Keyboard handling
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < items.length) {
        e.preventDefault();
        handleSelect(items[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Tab") {
      // optional: select highlighted on Tab
      if (activeIndex >= 0 && activeIndex < items.length) {
        handleSelect(items[activeIndex]);
      }
    }
  };

  // Selection
  const handleSelect = (s: Suggestion) => {
    setQuery(s.label);
    setOpen(false);
    setItems([]);
    setActiveIndex(-1);
    if (onSelect) onSelect(s);
  };

  // Highlight helper: naive case-insensitive index
  const highlight = (label: string, q: string) => {
    if (!q) return label;
    const idx = label.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return label;
    return (
      <>
        {label.slice(0, idx)}
        <strong>{label.slice(idx, idx + q.length)}</strong>
        {label.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div style={{ position: "relative", width: 320 }}>
      <input
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId.current}
        aria-activedescendant={activeIndex >= 0 ? `${listId.current}-item-${activeIndex}` : undefined}
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); }}
        onKeyDown={onKeyDown}
        onFocus={() => { if (items.length) setOpen(true); }}
        onBlur={() => {
          // small delay to allow click selection to register
          window.setTimeout(() => {
            if (mounted.current) setOpen(false);
          }, 150);
        }}
        style={{ width: "100%", padding: "8px 10px", boxSizing: "border-box" }}
      />
      {loading && <div style={{ position: "absolute", right: 8, top: 10 }}>…</div>}
      {items.length > 0 && items.map((item, i) => (<li key={item.id}>{item.label}</li>))}
      {open && (items.length > 0 || !loading) && (
        <ul
          id={listId.current}
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxHeight: 280,
            overflow: "auto",
            border: "1px solid #ddd",
            background: "#fff",
            margin: 0,
            padding: 0,
            listStyle: "none",
            zIndex: 1000,
          }}
        >
          {items.length === 0 && !loading ? (
            <li style={{ padding: 8 }}>No results</li>
          ) : items.map((s, idx) => {
            const highlighted = idx === activeIndex;
            return (
              <li
                key={s.id}
                id={`${listId.current}-item-${idx}`}
                role="option"
                aria-selected={highlighted}
                onMouseDown={(ev) => { ev.preventDefault(); /* avoid blur race */ handleSelect(s); }}
                onMouseEnter={() => setActiveIndex(idx)}
                style={{
                  padding: 8,
                  background: highlighted ? "#f0f0f0" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {renderSuggestion ? renderSuggestion(s, highlighted) : (
                  <div>
                    <div>{highlight(s.label, query)}</div>
                    {s.sub && <div style={{ fontSize: 12, color: "#666" }}>{s.sub}</div>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
