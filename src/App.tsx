import { Autocomplete, Suggestion, SuggestionResponse } from "./components/Autocomplete";
import "./styles.css";

function mockApi(query: string, page: number = 1): Promise<SuggestionResponse> {
  if (page > 3) return Promise.resolve({ page, total_pages: 3, suggestions: [] });
  const items = ["Apple", "Orange", "Applida", "Orangoutan", "Nesro Twice"];
  return new Promise(resolve => {
    setTimeout(() => {
      const filteredItems = items.filter(item => item.toLowerCase().indexOf(query.toLowerCase()) > -1);
      const suggestions: Suggestion[] = filteredItems.map(item => ({ suggestion: item }));
      resolve({
        page,
        total_pages: 3,
        suggestions,
      });
    }, 300);
  })
}

export default function App() {

  function onSuggestionSelect(suggestion: Suggestion) {
    alert(suggestion.suggestion);
  }

  return (
    <div className="App">
      <Autocomplete fetchSuggestions={mockApi} onSelect={onSuggestionSelect} />
    </div>
  );
}
