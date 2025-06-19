import { useState, useRef } from 'react';
import { GameState, RoundResult } from '../types/game-types';

export const useGameState = () => {
    const [gameState, setGameState] = useState<GameState>('idle');
    const [round, setRound] = useState<number>(0);
    const [userInput, setUserInput] = useState<string>('');
    const [gameMessages, setGameMessages] = useState<string[]>([]);
    const [prevUserWord, setPrevUserWord] = useState<string>('');
    const [prevAiWord, setPrevAiWord] = useState<string>('');
    const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
    
    // Refs for managing state across async operations
    const gameStateRef = useRef<GameState>('idle');
    const currentAiGuessRef = useRef<string>('');
    const isGeneratingRef = useRef<boolean>(false);

    // Word tracking state
    const [knownWords, setKnownWords] = useState<Set<string>>(new Set());
    const [newWords, setNewWords] = useState<string[]>([]);
    const [animatedNewWords, setAnimatedNewWords] = useState<Set<string>>(new Set());

    const resetGame = () => {
        setRound(1);
        setGameState('resetting');
        setPrevUserWord('');
        setPrevAiWord('');
        setGameMessages(['Enter any word to begin.']);
        setRoundResults([]);
        setUserInput('');
        setNewWords([]);
        setAnimatedNewWords(new Set());
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUserInput(event.target.value.toLowerCase());
        if (event.target.classList.contains('error')) {
            event.target.classList.remove('error');
            const errorMessage = document.querySelector('.error-message');
            if (errorMessage) {
                errorMessage.classList.add('hidden');
            }
        }
    };

    return {
        // State
        gameState,
        setGameState,
        round,
        setRound,
        userInput,
        setUserInput,
        gameMessages,
        setGameMessages,
        prevUserWord,
        setPrevUserWord,
        prevAiWord,
        setPrevAiWord,
        roundResults,
        setRoundResults,
        knownWords,
        setKnownWords,
        newWords,
        setNewWords,
        animatedNewWords,
        setAnimatedNewWords,
        
        // Refs
        gameStateRef,
        currentAiGuessRef,
        isGeneratingRef,
        
        // Actions
        resetGame,
        handleInputChange,
    };
}; 