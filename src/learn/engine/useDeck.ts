import { useStored } from "./storage.ts";
import { DECK_KEY, EMPTY_DECK, type Deck } from "./review.ts";

export function useDeck(): Deck {
  return useStored<Deck>(DECK_KEY, EMPTY_DECK);
}
