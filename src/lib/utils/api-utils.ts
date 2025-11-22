import OpenAI from "openai";
import { RoundResult, VectorSearchResult } from '../types/game-types';
import { openaiConfig } from '@/lib/hooks/use-open-ai';

const openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAIKEY,
    dangerouslyAllowBrowser: true
});

const API_BASE_URL = '/.netlify/functions';

export const getSmartGuessContext = async (
    userWord: string | null,
    aiWord: string | null
): Promise<VectorSearchResult | null> => {
    if (!userWord || !aiWord) {
        return null;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/get-rounds?userWord=${encodeURIComponent(userWord)}&aiWord=${encodeURIComponent(aiWord)}`
        );

        if (!response.ok) {
            console.warn('Vector search unavailable, continuing without context');
            return null;
        }

        const data = await response.json();
        
        if (!data.topGuesses || data.topGuesses.length === 0) {
            console.log('No similar past rounds found in database');
            return null;
        }

        console.log(`Retrieved ${data.topGuesses.length} context suggestions from vector DB`);
        return data;
    } catch (error) {
        console.warn('Error fetching smart guess context:', error);
        return null;
    }
};

export const apiRequest = async (endpoint: string, options?: RequestInit) => {
    try {
        const fullUrl = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        console.log(`Fetching API: ${fullUrl}`);

        const response = await fetch(fullUrl, options);

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Received non-JSON response:', text.substring(0, 100) + '...');
            throw new Error('Received non-JSON response from API');
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        throw error;
    }
};

export const generateAiGuess = async (
    previousUserWord: string | null,
    previousAiWord: string | null,
    warn = ''
): Promise<string> => {
    let instructions = `You are playing a word-association game. Your partner is about to guess a word. The goal is for you and your play partner to independently guess the same word.`;
    let roundInput = '';

    console.time('Time to generate guess');

    if (previousUserWord && previousAiWord) {
        const context = await getSmartGuessContext(previousUserWord, previousAiWord);
        
        instructions += `\n\nWhat single word relates to both '${previousUserWord}' and '${previousAiWord}'?`;
        
        if (context && context.topGuesses.length > 0) {
            const contextGuesses = context.topGuesses
                .slice(0, 3)
                .map((word, idx) => `${word} (similarity: ${(context.similarity[idx] * 100).toFixed(0)}%)`)
                .join(', ');
            instructions += `\n\nPast players with similar word combinations guessed: ${contextGuesses}. Consider these as strong possibilities, especially those with higher similarity scores.`;
        }
        
        if (warn) {
            instructions += `\n\nFORBIDDEN WORDS: ${warn}!`;
        }
    } else {
        const seed = 'abcdefghijklmnopqrstuvwy'.split('').sort(() => 0.5 - Math.random()).join('').substring(0, 16);
        roundInput = `\n\nThis is the first round. Create your word. It should be a single English noun, verb, adverb, or adjective. It must start with the letter '${seed[0]}'. Either the second or third letter must be '${seed[1]}'. Use at least one other letter from the following: '${seed.substring(2)}'. The only exception to these rules is if no words can be made with the assigned letters. In that case, create any word.`;
        console.log({ seed: `${seed}` });
    }

    instructions += `\n\n# *STRICT RULE: Your response must be only a single word. Do not use any previous round's words.*`;

    const guess = await openai.chat.completions.create({
        ...openaiConfig,
        messages: [
            { role: "user", content: instructions },
            { role: "user", content: roundInput }
        ],
    });

    const aiGuess = guess.choices[0].message.content || 'ERROR: No guess returned';
    console.timeEnd('Time to generate guess');

    return aiGuess;
};

export const checkForMatch = async (userGuess: string, aiGuess: string): Promise<boolean> => {
    const prompt = `Word 1: ${userGuess}\nWord 2: ${aiGuess}`;
    console.time('Time to check for match');

    const guess = await openai.chat.completions.create({
        ...openaiConfig,
        max_completion_tokens: 10,
        messages: [
            { role: "user", content: "Determine if the following two words are the same. Ignore capitalization, spacing, and allow for reasonable spelling mistakes. Words which have the same root but are different tenses or grammatical forms may be considered the same, for example 'running' and 'runner', 'jumping' and 'jump', 'perform' and 'performance', 'vote' and 'votes', 'create' and 'creator', etc. would be considered the same. Return only `true` or `false`." },
            { role: "user", content: prompt }
        ],
    });

    console.timeEnd('Time to check for match');
    return guess.choices[0].message.content?.toLowerCase() === 'true';
};

export const recordRoundToDatabase = async (roundResults: RoundResult[], finalCorrectGuess: string) => {
    console.time('Time to record round to database');

    try {
        const response = await fetch(`${API_BASE_URL}/record-round`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ roundResults, finalCorrectGuess })
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (parseError) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
            throw new Error(`Database error: ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        console.log("Database:", result.message);
        return result;
    } catch (error) {
        console.error("Error sending data to backend API:", error);
        throw error;
    } finally {
        console.timeEnd('Time to record round to database');
    }
}; 