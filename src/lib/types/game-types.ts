export type GameState = 'idle' | 'awaitingUserGuess' | 'waitingForAI' | 'awaitingRoundWon' | 'roundWon' | 'roundLost' | 'resetting';

export interface RoundResult {
    round: number;
    userGuess: string;
    aiGuess: string;
}

export interface VectorSearchResult {
    topGuesses: string[];
    similarity: number[];
}

export interface GameConfig {
    ROUND_LENGTH: number;
    API_BASE_URL: string;
}

export interface AnimationConfig {
    delay: number;
    duration: number;
    scale: [number, number];
    color: [string, string];
}

export interface GridConfig {
    mobile: [number, number];
    desktop: [number, number];
    breakpoint: number;
}

export interface ColorTheme {
    indigo3: string;
    indigo2: string;
    indigo1: string;
    indigo0: string;
    green1: string;
    red1: string;
} 