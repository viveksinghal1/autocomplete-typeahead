import { useEffect, useState } from "react";

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

    useEffect(() => {
        if (!query) {
            setSuggestions([]);
            setIsFetching(false);
            return;
        }

        const timer = setTimeout(() => {
            console.log('started');
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

    }, []);

    return (
        <div>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder}/>
            {isFetching}
            {isFetching && <p>Fetching the results....</p>}
            {!isFetching && suggestions.length > 0 &&
                <ul>
                    {suggestions.map((s, i) => (
                        <li key={i} onClick={() => {
                            setQuery(s.suggestion);
                            setSuggestions([]);
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