import { ChangeEvent, useEffect, useRef, useState } from "react";

export type SuggestionResponse = {
    page?: number;
    total_pages?: number;
    suggestions: Suggestion[];
}

export type Suggestion = {
    suggestion: string;
}

type AutocompleteProps = {
    fetchSuggestions: (q: string, page?: number, signal?: AbortSignal) => Promise<SuggestionResponse>;
    placeholder?: string;
    debounceTime?: number;
    onSelect?: (s: Suggestion) => void;
}

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

export function Autocomplete({
    fetchSuggestions,
    placeholder = 'Search...',
    debounceTime = 300,
    onSelect,
}: AutocompleteProps) {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [suggestionSelected, setSuggestionSelected] = useState(false);
    const [error, setError] = useState("");
    const [retryFlag, setRetryFlag] = useState(0);
    const cache = useRef(new LRUCache(30, 86400));

    useEffect(() => {
        if (!query.trim()) {
            setSuggestions([]);
            setError("");
            setIsFetching(false);
            return;
        }

        if (suggestionSelected) return;

        const cachedValue = cache.current.get(query);

        if (cachedValue) {
            setSuggestions(cachedValue as Suggestion[]);
            return;
        }
        
        const controller = new AbortController();
        setIsFetching(true);

        const timer2 = setTimeout(() => {
            if (!controller.signal.aborted) {
                controller.abort();
                setError("API took too much time");
            }
        }, 4000);

        const timer = setTimeout(() => {
            setError("");

            fetchSuggestions(query, 1, controller.signal)
            .then(resp => {
                if (resp && resp.suggestions) {
                    if (controller.signal.aborted) return; // ✅ don’t update if aborted
                    setSuggestions(resp.suggestions);
                    cache.current.set(query, resp.suggestions);
                }
            })
            .catch((err) => {
                if (err.name !== "AbortError") {
                    setSuggestions([]);
                    setError("Failed");
                }
            })
            .finally(() => {
                setIsFetching(false);
                if (!controller.signal.aborted) {
                    clearTimeout(timer2);
                }
            });
        }, debounceTime);

        return () => {
            controller.abort();
            clearTimeout(timer);
            clearTimeout(timer2);
        }

    }, [query, debounceTime, fetchSuggestions, retryFlag]);

    function onInputChange(e: ChangeEvent<HTMLInputElement>) {
        setQuery(e.currentTarget.value);
        setSuggestionSelected(false);
    }

    return (
        <div>
            <input type="text" value={query} onChange={onInputChange} placeholder={placeholder}/>
            {isFetching}
            {isFetching && <p>Fetching the results....</p>}
            {error && (
                <div className="error">
                {error}{" "}
                    <button onClick={() => setRetryFlag(f => f + 1)}>Retry</button>
                </div>
            )}
            {!isFetching && !error && suggestions.length > 0 &&
                <ul>
                    {suggestions.map((s, i) => (
                        <li key={i} onClick={() => {
                            setQuery(s.suggestion);
                            setSuggestions([]);
                            setSuggestionSelected(true);
                            onSelect?.(s);
                        }}>
                            <span>{s.suggestion}</span>
                        </li>
                    ))}
                </ul>
            }
            {!!query && !isFetching && !error && !suggestionSelected && suggestions.length === 0 && <p>No result found</p>}
        </div>
    )

}