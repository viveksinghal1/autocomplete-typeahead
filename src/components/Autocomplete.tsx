import { ChangeEvent, useEffect, useState } from "react";

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

    useEffect(() => {
        if (!query) {
            setSuggestions([]);
            setError("");
            return;
        }
        
        if (suggestionSelected) return;
        const controller = new AbortController();

        const timer = setTimeout(() => {
            setIsFetching(true);
            setError("");

            fetchSuggestions(query, 1, controller.signal)
            .then(resp => {
                if (resp && resp.suggestions && resp.suggestions.length > 0) {
                    setSuggestions(resp.suggestions);
                }
            })
            .catch((err) => {setSuggestions([]);setError("Failed")})
            .finally(() => setIsFetching(false));
        }, debounceTime);

        const timer2 = setTimeout(() => {
            controller.abort();
            setError("API took too much time");
        }, 4000);

        return () => {
            controller.abort();
            clearTimeout(timer);
            clearTimeout(timer2);
        }

    }, [query, debounceTime, fetchSuggestions]);

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
                    <button onClick={() => fetchSuggestions(query)}>Retry</button>
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
        </div>
    )

}