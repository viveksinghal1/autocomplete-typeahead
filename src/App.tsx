import { Autocomplete, Suggestion, SuggestionResponse } from "./components/Autocomplete";
import "./styles.css";
// import Autocomplete, { Suggestion } from "./components/Autocompletev2";

function mockApi(query: string, page: number = 1, signal: AbortSignal = (new AbortController).signal): Promise<SuggestionResponse> {
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
    }, 200);
  })
}

// function mockApi(query: string, signal: AbortSignal = (new AbortController).signal): Promise<Suggestion[]> {
//   const items = ["Apple", "Orange", "Applida", "Orangoutan", "Nesro Twice"];
//   return new Promise(resolve => {
//     setTimeout(() => {
//       const resp = items.filter(item => item.toLowerCase().indexOf(query.toLowerCase()) > -1);
//       let i = 7;
//       const suggestions: Suggestion[] = resp.map(item => ({id: JSON.stringify(i++), label: item}));
//       resolve(suggestions);
//     }, 300);
//   })
// }

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
