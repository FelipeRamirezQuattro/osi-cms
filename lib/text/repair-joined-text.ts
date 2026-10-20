// The Wix scrape sometimes joined two adjacent text nodes with no separator
// ("ISO 45001" + "Health & Safety Management", "workplace." + "Safety …").
// This restores the missing space at the two places the joins were found:
// sentence punctuation directly followed by a capitalised word, and a number
// of three or more digits directly followed by one. Only run on scraped copy.
export function repairJoinedText(text: string): string {
  return text
    .replace(/([a-z)])([.!?])([A-Z][a-z]{2,})/g, "$1$2 $3")
    .replace(/(\d{3,})([A-Z][a-z]{2,})/g, "$1 $2");
}
