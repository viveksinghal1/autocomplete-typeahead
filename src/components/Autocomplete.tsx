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

    useEffect(() => {
        if (!query) {
            setSuggestions([]);
            setIsFetching(false);
            return;
        }
        
        if (suggestionSelected) return;

        const timer = setTimeout(() => {
            setIsFetching(true);
            fetchSuggestions(query)
            .then(resp => {
                if (resp && resp.suggestions && resp.suggestions.length > 0) {
                    setSuggestions(resp.suggestions);
                }
            })
            .catch((err) => setSuggestions([]))
            .finally(() => setIsFetching(false));
        }, debounceTime);

        return () => {
            clearTimeout(timer);
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
            {!isFetching && suggestions.length > 0 &&
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