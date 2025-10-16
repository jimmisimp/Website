import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    gameIdle,
    gameAwaitingUserGuess,
    gameWaitingForAI,
    gameResetting,
    gameRoundLost,
    gameRoundWon,
    gameAwaitingRoundWon,
} from '@/app/components';
import { useGameState, useAnimation, useTimer } from '@/lib/hooks';
import {
    apiRequest,
    generateAiGuess,
    checkForMatch,
    recordRoundToDatabase,
    checkIfValidWord,
    loadDictionary,
    processNewWords,
    generateGameMessages,
    getColorTheme,
} from '@/lib/utils';
import type { RoundResult } from '@/lib/types';

const ROUND_LENGTH = 25000;
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export const MindMeld: React.FC = () => {
    const {
        gameState: phase,
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
        setKnownWords,
        newWords,
        setNewWords,
        animatedNewWords,
        setAnimatedNewWords,
        gameStateRef,
        currentAiGuessRef,
        isGeneratingRef,
        resetGame,
        handleInputChange,
    } = useGameState();

    const colors = getColorTheme();
    const animation = useAnimation(phase, colors);
    const [dictionarySet, setDictionarySet] = useState<Set<string>>(new Set());
    const [inputError, setInputError] = useState<string | null>(null);
    const isStarted = useRef(false);

    useEffect(() => {
        loadDictionary().then(setDictionarySet);
    }, []);

    const handleTimeUp = useCallback(() => {
        setGameState('roundLost');
        setGameMessages(prev => [
            ...prev,
            `<span class='prev-words prev-words-user'>${prevUserWord}</span><span class='prev-words prev-words-ai'>${prevAiWord}</span>`,
        ]);
        animation.animateGrid('roundLost');
    }, [setGameState, setGameMessages, prevUserWord, prevAiWord, animation]);

    useTimer(phase, round, ROUND_LENGTH, handleTimeUp);

    const waitForAi = async () => {
        if (!isGeneratingRef.current) return;
        setGameState('waitingForAI');
        while (isGeneratingRef.current) {
            await sleep(80);
        }
    };

    const requestValidAiGuess = async (
        previousUserWord: string | null,
        previousAiWord: string | null,
        results: RoundResult[],
    ): Promise<string> => {
        let guess = await generateAiGuess(previousUserWord, previousAiWord);
        if (!dictionarySet.size) return guess.toLowerCase();

        const blocked = new Set<string>();
        const extraWords = [previousUserWord, previousAiWord].filter(Boolean) as string[];

        while (true) {
            const [isValid] = await checkIfValidWord(guess, results, dictionarySet, ...extraWords);
            if (isValid || blocked.size > 25) {
                return guess.toLowerCase();
            }
            blocked.add(guess.toLowerCase());
            guess = await generateAiGuess(previousUserWord, previousAiWord, Array.from(blocked).join(', '));
        }
    };

    const handleStartGame = async () => {
        resetGame();
        setInputError(null);
        isGeneratingRef.current = true;

        try {
            const newGuess = await requestValidAiGuess(null, null, []);
            currentAiGuessRef.current = newGuess;
            setGameState('awaitingUserGuess');
            animation.animateGrid();
        } catch (error) {
            console.error('Error starting game:', error);
            setGameMessages(['Error starting game. Please try again.']);
            setGameState('idle');
        } finally {
            isGeneratingRef.current = false;
        }
    };

    const handleRoundWon = async (currentUserGuess: string, turnMessages: string[]) => {
        let latestNewWords = newWords;
        try {
            console.time('Time to fetch words');
            const data = await apiRequest('get-all-words');
            console.timeEnd('Time to fetch words');

            if (data?.uniqueWords) {
                const validWords = data.uniqueWords
                    .filter((word: string | null) => word !== null)
                    .map((word: string) => word.toLowerCase());

                setKnownWords(new Set(validWords));

                const newWordsFound = processNewWords(roundResults, currentUserGuess, validWords);
                latestNewWords = newWordsFound;
                setNewWords(newWordsFound);

                const finalMessages = generateGameMessages(roundResults, currentUserGuess, validWords);
                setGameMessages(finalMessages);
            }
        } catch (error) {
            console.error('Failed to check for new words:', error);
            setGameMessages([...turnMessages, `<span class='prev-words prev-words-match'>${currentUserGuess}</span>`]);
        }

        const updatedResults: RoundResult[] = [
            ...roundResults,
            {
                round,
                userGuess: currentUserGuess,
                aiGuess: currentAiGuessRef.current,
            },
        ];

        setGameState('roundWon');
        animation.animateGrid('roundWon');
        setRoundResults(updatedResults);
        await recordRoundToDatabase(updatedResults, currentUserGuess);
        isGeneratingRef.current = false;

        setTimeout(() => {
            animation.animateNewWordBadges(latestNewWords, animatedNewWords);
            setAnimatedNewWords(prev => {
                const updated = new Set(prev);
                latestNewWords.forEach(word => updated.add(word.toLowerCase()));
                return updated;
            });
        }, 1000);
    };

    const handleRoundContinue = async (currentUserGuess: string, turnMessages: string[]) => {
        const updatedResults: RoundResult[] = [
            ...roundResults,
            {
                round,
                userGuess: currentUserGuess,
                aiGuess: currentAiGuessRef.current,
            },
        ];

        setRoundResults(updatedResults);
        setPrevUserWord(currentUserGuess);
        setPrevAiWord(currentAiGuessRef.current);
        setGameMessages(turnMessages);
        setRound(prev => prev + 1);

        try {
            currentAiGuessRef.current = await requestValidAiGuess(
                currentUserGuess,
                currentAiGuessRef.current,
                updatedResults,
            );
        } catch (error) {
            console.error('Error generating AI guess:', error);
        } finally {
            setGameState('awaitingUserGuess');
            isGeneratingRef.current = false;
        }
    };

    const handleSubmitGuess = async () => {
        if (phase !== 'awaitingUserGuess') return;
        const trimmed = userInput.trim().toLowerCase();
        if (!trimmed) return;

        const [isValid, errorType] = await checkIfValidWord(
            trimmed,
            roundResults,
            dictionarySet,
            prevUserWord,
            prevAiWord,
        );

        if (!isValid) {
            setInputError(errorType === 'used' || errorType === 'suffix'
                ? 'Word was used previously.'
                : 'Word was not found in the dictionary.');
            return;
        }

        setInputError(null);
        setUserInput('');
        setGameState('resetting');
        await waitForAi();

        try {
            isGeneratingRef.current = true;
            const turnMessages = roundResults.length
                ? roundResults.map(result =>
                    `<span class='prev-words prev-words-user'>${result.userGuess}</span><span class='prev-words prev-words-ai'>${result.aiGuess}</span>`,
                )
                : ['First round.'];

            if (await checkForMatch(trimmed, currentAiGuessRef.current)) {
                setGameState('awaitingRoundWon');
                await handleRoundWon(trimmed, turnMessages);
            } else {
                await handleRoundContinue(trimmed, turnMessages);
            }
        } catch (error) {
            console.error('Error processing guess:', error);
            setGameMessages(['Error communicating with AI. Reload the page and try again.']);
            setGameState('idle');
            isGeneratingRef.current = false;
        }
    };

    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSubmitGuess();
        }
    };

    const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (inputError) setInputError(null);
        handleInputChange(event);
    };

    useEffect(() => {
        if (!isStarted.current) {
            isStarted.current = true;
            animation.animateGrid('idle');
        }
    }, [animation]);

    useEffect(() => {
        gameStateRef.current = phase;
    }, [phase, gameStateRef]);

    useEffect(() => {
        if (phase === 'roundWon') {
            setTimeout(() => {
                animation.animateNewWordBadges(newWords, animatedNewWords);
            }, 1000);
        }
    }, [phase, newWords, animatedNewWords, animation]);

    const renderGameControls = () => {
        switch (phase) {
            case 'idle':
                return gameIdle(handleStartGame);
            case 'awaitingUserGuess':
                return gameAwaitingUserGuess(
                    handleSubmitGuess,
                    handleKeyPress,
                    round,
                    prevUserWord,
                    prevAiWord,
                    userInput,
                    onInputChange,
                    inputError,
                );
            case 'waitingForAI':
                return gameWaitingForAI(round, prevUserWord, prevAiWord, userInput);
            case 'resetting':
                return gameResetting();
            case 'roundLost':
                return gameRoundLost(handleStartGame, round);
            case 'awaitingRoundWon':
                return gameAwaitingRoundWon();
            case 'roundWon':
                return gameRoundWon(handleStartGame, round, newWords);
            default:
                return null;
        }
    };

    return (
        <div className="mind-meld-game">
            <h2>MindMeld</h2>
            <div className="game-area">
                <div className="message-display">
                    <span className='prev-words-container'>
                        {gameMessages.length > 0 ? (
                            gameMessages.map((msg, index) => (
                                <div
                                    className='prev-words-group'
                                    key={index}
                                    dangerouslySetInnerHTML={{ __html: msg }}
                                />
                            ))
                        ) : (
                            <p className='subtitle'>Guess the same word as your AI partner.</p>
                        )}
                    </span>
                </div>

                <div
                    className='timer'
                    hidden={phase !== 'awaitingUserGuess' || round < 2}
                >
                    You have <span id="timerDisplay">
                        <span className='time-vals'>25</span>:<span className='time_secs time-vals'>00</span>
                    </span> left to guess.
                </div>

                {renderGameControls()}
            </div>

            <div className='wave-container'>
                {Array.from({ length: animation.grid[0] * animation.grid[1] }).map((_, index) => (
                    <span key={index} className='wave-dot'></span>
                ))}
            </div>
        </div>
    );
};
