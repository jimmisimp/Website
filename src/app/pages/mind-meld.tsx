import React, { useCallback, useEffect, useRef, useState } from 'react';
import { utils } from 'animejs';
import { gameIdle, gameAwaitingUserGuess, gameWaitingForAI, gameResetting, gameRoundLost, gameRoundWon, gameAwaitingRoundWon } from '@/app/components';
import { useGameState, useAnimation, useTimer } from '@/lib/hooks';
import { apiRequest, generateAiGuess, checkForMatch, recordRoundToDatabase, checkIfValidWord, loadDictionary } from '@/lib/utils';
import { 
    processNewWords, 
    generateGameMessages, 
    getColorTheme 
} from '@/lib/utils';

// Configuration
const ROUND_LENGTH = 25000;

export const MindMeld: React.FC = () => {
    const gameState = useGameState();
    const colors = getColorTheme();
    const animation = useAnimation(gameState.gameState, colors);
    const isStarted = useRef<boolean>(false);
    const [dictionarySet, setDictionarySet] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadDictionary().then(setDictionarySet);
    }, []);

    // Timer with callback for when time runs out
    const handleTimeUp = useCallback(() => {
        gameState.setGameState('roundLost');
        gameState.setGameMessages(prev => [
            ...prev, 
            `<span class='prev-words prev-words-user'>${gameState.prevUserWord}</span><span class='prev-words prev-words-ai'>${gameState.prevAiWord}</span>`
        ]);
        animation.animateGrid('roundLost');
    }, [gameState.setGameState, gameState.setGameMessages, gameState.prevUserWord, gameState.prevAiWord, animation]);

    useTimer(gameState.gameState, gameState.round, ROUND_LENGTH, handleTimeUp);

    // Game logic functions
    const handleStartGame = async () => {
        console.log('Starting game');
        gameState.resetGame();
        
        try {
            let newGuess = await generateAiGuess(null, null);
            const badGuesses = [];
            while ((await checkIfValidWord(newGuess, gameState.roundResults, dictionarySet))[0] === false) {
                badGuesses.push(newGuess);
                newGuess = await generateAiGuess(newGuess, badGuesses.join(', '));
            }
            gameState.currentAiGuessRef.current = newGuess.toLowerCase();
            gameState.setGameState('awaitingUserGuess');
            animation.animateGrid();
        } catch (error) {
            console.error("Error starting game:", error);
            gameState.setGameMessages(['Error starting game. Please try again.']);
            gameState.setGameState('idle');
        } finally {
            gameState.isGeneratingRef.current = false;
        }
    };

    const handleSubmitGuess = async () => {
        if (gameState.gameState !== 'awaitingUserGuess' || !gameState.userInput.trim()) return;
        
        // Check if word was previously used
        const [isValid, errorType] = await checkIfValidWord(
            gameState.userInput.trim(), 
            gameState.roundResults, 
            dictionarySet,
            gameState.prevUserWord, 
            gameState.prevAiWord
        );
            
        if (!isValid) {
            const input = utils.$('#user-input')[0];
            if (input) {
                input.classList.add('error');
                const errorMessage = utils.$('#input-error')[0];
                if (errorMessage){
                    errorMessage.textContent = errorType === 'used' ? 'Word was used previously.' : 'Word was not found in the dictionary.';
                    (errorMessage as HTMLElement).hidden = false;
                }
            }
            return;
        }
        
        gameState.setGameState('awaitingUserGuess');
        
        const currentUserGuess = gameState.userInput.trim().toLowerCase();
        gameState.setUserInput('');
        
        gameState.setGameState('resetting');
        // Wait for AI generation to complete
        while (gameState.isGeneratingRef.current) {
            gameState.setGameState('waitingForAI');
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        try {
            gameState.isGeneratingRef.current = true;
            const turnMessages = gameState.roundResults.length > 0 
                ? gameState.roundResults.map(result => 
                    `<span class='prev-words prev-words-user'>${result.userGuess}</span><span class='prev-words prev-words-ai'>${result.aiGuess}</span>`
                  )
                : ['First round.'];

            // Check if words match
            if (await checkForMatch(currentUserGuess, gameState.currentAiGuessRef.current)) {
                gameState.setGameState('awaitingRoundWon');
                await handleRoundWon(currentUserGuess, turnMessages);
            } else {
                await handleRoundContinue(currentUserGuess, turnMessages);
            }
        } catch (error) {
            console.error("Error processing guess:", error);
            gameState.setGameMessages(["Error communicating with AI. Reload the page and try again."]);
            gameState.setGameState('idle');
        }
    };

    const handleRoundWon = async (currentUserGuess: string, turnMessages: string[]) => {
        try {
            console.time('Time to fetch words');
            const data = await apiRequest('get-all-words');
            console.timeEnd('Time to fetch words');
            
            if (data?.uniqueWords) {
                const validWords = data.uniqueWords
                    .filter((word: string | null) => word !== null)
                    .map((word: string) => word.toLowerCase());
                
                gameState.setKnownWords(new Set(validWords));
                
                const newWordsFound = processNewWords(gameState.roundResults, currentUserGuess, validWords);
                gameState.setNewWords(newWordsFound);
                
                const finalMessages = generateGameMessages(gameState.roundResults, currentUserGuess, validWords);
                gameState.setGameMessages(finalMessages);
            }
        } catch (error) {
            console.error("Failed to check for new words:", error);
            gameState.setGameMessages([...turnMessages, `<span class='prev-words prev-words-match'>${currentUserGuess}</span>`]);
        }
        
        gameState.setGameState('roundWon');
        animation.animateGrid('roundWon');
        gameState.setRoundResults(prev => [...prev, { 
            round: gameState.round, 
            userGuess: currentUserGuess, 
            aiGuess: gameState.currentAiGuessRef.current 
        }]);
        
        await recordRoundToDatabase(gameState.roundResults, currentUserGuess);
        gameState.isGeneratingRef.current = false;
        
        // Schedule animation of new word badges
        setTimeout(() => {
            animation.animateNewWordBadges(gameState.newWords, gameState.animatedNewWords);
            gameState.setAnimatedNewWords(prev => {
                const updated = new Set(prev);
                gameState.newWords.forEach(word => updated.add(word.toLowerCase()));
                return updated;
            });
        }, 1000);
    };

    const handleRoundContinue = async (currentUserGuess: string, turnMessages: string[]) => {
        gameState.setRoundResults(prev => [...prev, { 
            round: gameState.round, 
            userGuess: currentUserGuess, 
            aiGuess: gameState.currentAiGuessRef.current 
        }]);
        
        gameState.setPrevUserWord(currentUserGuess);
        gameState.setPrevAiWord(gameState.currentAiGuessRef.current);
        gameState.setGameMessages(turnMessages);
        gameState.setRound(prev => prev + 1);

        // Generate new AI guess for next round
        try {
            let newGuess = await generateAiGuess(currentUserGuess, gameState.currentAiGuessRef.current);
            const badGuesses = [];
            while ((await checkIfValidWord(newGuess, gameState.roundResults, dictionarySet))[0] === false) {
                badGuesses.push(newGuess);
                newGuess = await generateAiGuess(currentUserGuess, gameState.currentAiGuessRef.current, badGuesses.join(', '));
            }
            gameState.currentAiGuessRef.current = newGuess.toLowerCase();
        } catch (error) {
            console.error("Error generating AI guess:", error);
        } finally {
            gameState.setGameState('awaitingUserGuess');
            gameState.isGeneratingRef.current = false;
        }
    };

    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSubmitGuess();
        }
    };

    // Effects
    useEffect(() => {
        if (!isStarted.current) {
            isStarted.current = true;
            animation.animateGrid('idle');
        }
    }, [animation]);

    useEffect(() => {
        gameState.gameStateRef.current = gameState.gameState;
    }, [gameState.gameState, gameState.gameStateRef]);

    useEffect(() => {
        if (gameState.gameState === 'roundWon') {
            setTimeout(() => {
                animation.animateNewWordBadges(gameState.newWords, gameState.animatedNewWords);
            }, 1000);
        }
    }, [gameState.gameState, gameState.newWords, gameState.animatedNewWords, animation]);

    // Render functions
    const renderGameControls = () => {
        switch (gameState.gameState) {
            case 'idle':
                return gameIdle(handleStartGame);

            case 'awaitingUserGuess':
                return gameAwaitingUserGuess(handleSubmitGuess, handleKeyPress, gameState.round, gameState.prevUserWord, gameState.prevAiWord, gameState.userInput, gameState.handleInputChange);

            case 'waitingForAI':
                return gameWaitingForAI(gameState.round, gameState.prevUserWord, gameState.prevAiWord, gameState.userInput);

            case 'resetting':
                return gameResetting();

            case 'roundLost':
                return gameRoundLost(handleStartGame, gameState.round);

            case 'awaitingRoundWon':
                return gameAwaitingRoundWon();

            case 'roundWon':
                return gameRoundWon(handleStartGame, gameState.round, gameState.newWords);
        }
    };

    return (
        <div className="mind-meld-game">
            <h2>MIndmeld</h2>
            <div className="game-area">
                <div className="message-display">
                    <span className='prev-words-container'>
                        {gameState.gameMessages.length > 0 ? (
                            gameState.gameMessages.map((msg, index) => (
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
                    hidden={gameState.gameState !== 'awaitingUserGuess' || gameState.round < 2}
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