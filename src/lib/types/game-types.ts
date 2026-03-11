export type GameState =
  | 'idle'
  | 'awaitingUserGuess'
  | 'waitingForAI'
  | 'roundWon'
  | 'roundLost'
  | 'resetting';

export type RoundResult = {
  userGuess: string;
  aiGuess: string;
};

export type VectorSearchResult = {
  topGuesses: string[];
  similarity: number[];
};

export type ColorTheme = {
  indigo3: string;
  indigo2: string;
  indigo1: string;
  indigo0: string;
  green1: string;
  red1: string;
};

export type GridConfig = {
  mobile: [number, number];
  desktop: [number, number];
  breakpoint: number;
};
