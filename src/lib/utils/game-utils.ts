import { RoundResult } from '../types/game-types';

export const checkIfPreviouslyUsed = (
    checkedWord: string,
    roundResults: RoundResult[],
    ...additionalWords: (string | null)[]
): boolean => {
    const normalizedWord = checkedWord.toLowerCase();
    const allWords = [
        ...roundResults.flatMap(result => [result.userGuess, result.aiGuess]),
        ...additionalWords.filter(word => word !== null)
    ].map(word => word!.toLowerCase());

    const suffixes = ['s', 'es', 'ed', 'ing', 'ly', 'ate', 'ion', 'r', 'red', 'ring', 'led'];

    return allWords.some(existingWord => {
        if (normalizedWord === existingWord) return true;

        for (const suffix of suffixes) {
            if (normalizedWord === existingWord + suffix || existingWord === normalizedWord + suffix) {
                return true;
            }
        }
        return false;
    });
};

export const checkIfValidWord = async (
    checkedWord: string, 
    roundResults: RoundResult[], 
    dictionarySet: Set<string>,
    ...args: any[]
): Promise<boolean> => {
    checkedWord = checkedWord.toLowerCase().trim();
    // Check if word is in dictionary
    const dictionary = dictionarySet;
    if (!dictionary.has(checkedWord)) {
        console.log(`Word "${checkedWord}" not found in dictionary`);
        return false;
    }

    // Check against previously used words
    const roundWords = [
        roundResults.map(result => result.userGuess.toLowerCase()),
        roundResults.map(result => result.aiGuess.toLowerCase()),
        ...args.map(arg => typeof arg === 'string' ? arg.toLowerCase() : '')
    ].flat().filter(w => w);
    
    const suffixes = ['s', 'es', 'ed', 'ing', 'ly', 'ate', 'ion', 'r', 'red', 'ring', 'led'];

    // Check for exact matches or suffix variations
    for (const usedWord of roundWords) {
        if (checkedWord === usedWord) {
            return false;
        }

        // Check suffix variations
        for (const suffix of suffixes) {
            if (checkedWord === usedWord + suffix || usedWord === checkedWord + suffix) {
                return false;
            }
        }
    }

    return true;
};

    export const generateWordHtml = (
        word: string,
        className: string,
        isNewWord: boolean
    ): string => {
        const baseHtml = `<span class='${className}'>${word}</span>`;

        if (isNewWord) {
            return `<span class='${className}'>${word}<span class="new-badge" data-word="${word.toLowerCase()}">★</span></span>`;
        }

        return baseHtml;
    };

    export const processNewWords = (
        roundResults: RoundResult[],
        finalWord: string,
        knownWords: string[]
    ): string[] => {
        const newWordsFound: string[] = [];
        const knownWordsLower = knownWords.map(word => word.toLowerCase());

        // Check all round results
        for (const result of roundResults) {
            const userWordLower = result.userGuess.toLowerCase();
            const aiWordLower = result.aiGuess.toLowerCase();

            if (!knownWordsLower.includes(userWordLower)) {
                newWordsFound.push(result.userGuess);
            }
            if (!knownWordsLower.includes(aiWordLower)) {
                newWordsFound.push(result.aiGuess);
            }
        }

        // Check the final matching word
        const finalWordLower = finalWord.toLowerCase();
        if (!knownWordsLower.includes(finalWordLower)) {
            newWordsFound.push(finalWord);
        }

        return newWordsFound;
    };

    export const generateGameMessages = (
        roundResults: RoundResult[],
        finalWord: string,
        knownWords: string[]
    ): string[] => {
        const knownWordsLower = knownWords.map(word => word.toLowerCase());

        const messages = roundResults.map(result => {
            const userWordHtml = generateWordHtml(
                result.userGuess,
                'prev-words prev-words-user',
                !knownWordsLower.includes(result.userGuess.toLowerCase())
            );

            const aiWordHtml = generateWordHtml(
                result.aiGuess,
                'prev-words prev-words-ai',
                !knownWordsLower.includes(result.aiGuess.toLowerCase())
            );

            return `${userWordHtml}${aiWordHtml}`;
        });

        const matchHtml = generateWordHtml(
            finalWord,
            'prev-words prev-words-match',
            !knownWordsLower.includes(finalWord.toLowerCase())
        );

        return [...messages, matchHtml];
    };

    export const getColorTheme = () => {
        const bodyStyles = window.getComputedStyle(document.body);

        return {
            indigo3: bodyStyles.getPropertyValue('--color-indigo-3').trim(),
            indigo2: bodyStyles.getPropertyValue('--color-indigo-2').trim(),
            indigo1: bodyStyles.getPropertyValue('--color-indigo-1').trim(),
            indigo0: bodyStyles.getPropertyValue('--color-indigo-0').trim(),
            green1: bodyStyles.getPropertyValue('--color-green-1').trim(),
            red1: bodyStyles.getPropertyValue('--color-red-1').trim(),
        };
    };



export const loadDictionary = async (): Promise<Set<string>> => {

    try {
        const response = await fetch('/dictionary.txt');

        const text = await response.text();
        const words = text
            .split('\n')
            .map(word => word.trim().toLowerCase())
            .filter(word => word.length > 1);

        const wordSet = new Set(words);

        return wordSet;
    } catch (error) {
        console.error('Error loading dictionary:', error);
        return new Set();
    }
};