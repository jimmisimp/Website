import React, { useEffect, useRef } from 'react';
import { utils } from 'animejs';

import { useGameState, useAnimation, useTimer } from '@/lib/hooks';
import { apiRequest, generateAiGuess, checkForMatch, recordRoundToDatabase } from '@/lib/utils';
import { 
    checkIfPreviouslyUsed, 
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

    // Timer with callback for when time runs out
    const handleTimeUp = () => {
        gameState.setGameState('roundLost');
        gameState.setGameMessages(prev => [
            ...prev, 
            `<span class='prev-words prev-words-user'>${gameState.prevUserWord}</span><span class='prev-words prev-words-ai'>${gameState.prevAiWord}</span>`
        ]);
        animation.animateGrid('roundLost');
    };

    useTimer(gameState.gameState, gameState.round, ROUND_LENGTH, handleTimeUp);

    // Game logic functions
    const handleStartGame = async () => {
        console.log('Starting game');
        gameState.resetGame();
        
        try {
            const newAiGuess = await generateAiGuess(null, null);
            gameState.currentAiGuessRef.current = newAiGuess.toLowerCase();
            gameState.setGameState('awaitingUserGuess');
            animation.animateGrid();
        } catch (error) {
            console.error("Error starting game:", error);
            gameState.setGameMessages(['Error starting game. Please try again.']);
            gameState.setGameState('idle');
        }
    };

    const handleSubmitGuess = async () => {
        if (gameState.gameState !== 'awaitingUserGuess' || !gameState.userInput.trim()) return;
        
        gameState.setGameState('resetting');

        // Check if word was previously used
        if (checkIfPreviouslyUsed(
            gameState.userInput.trim(), 
            gameState.roundResults, 
            gameState.prevUserWord, 
            gameState.prevAiWord
        )) {
            gameState.setGameState('awaitingUserGuess');
            const input = utils.$('#user-input')[0];
            if (input) {
                input.classList.add('error');
                const errorMessage = utils.$('.error-message')[0];
                if (errorMessage) errorMessage.classList.remove('hidden');
            }
            return;
        }

        const currentUserGuess = gameState.userInput.trim().toLowerCase();
        gameState.setUserInput('');

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
                await handleRoundWon(currentUserGuess, turnMessages);
            } else {
                await handleRoundContinue(currentUserGuess, turnMessages);
            }
        } catch (error) {
            console.error("Error processing guess:", error);
            gameState.setGameMessages(prev => [...prev, "Error communicating with AI. Please try again."]);
            gameState.setGameState('awaitingUserGuess');
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
        gameState.setGameState('awaitingUserGuess');

        // Generate new AI guess for next round
        try {
            const newGuess = await generateAiGuess(currentUserGuess, gameState.currentAiGuessRef.current);
            gameState.currentAiGuessRef.current = newGuess.toLowerCase();
        } catch (error) {
            console.error("Error generating AI guess:", error);
        } finally {
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
                return (
                    <div className="game-controls">
                        <div className='input-group'>
                            <button className='main-button' onClick={handleStartGame}>
                                Start Game
                            </button>
                        </div>
                    </div>
                );

            case 'awaitingUserGuess':
                return (
                    <div className="game-controls">
                        {gameState.round > 1 && gameState.prevUserWord && gameState.prevAiWord && (
                            <p className="prompt">
                                Guesses were <span className='guess-words'>{gameState.prevUserWord}</span> and <span className='guess-words'>{gameState.prevAiWord}</span>
                            </p>
                        )}
                        <div className='input-group'>
                            <input
                                autoComplete='off'
                                id="user-input"
                                type="text"
                                maxLength={32}
                                value={gameState.userInput}
                                onChange={gameState.handleInputChange}
                                onKeyPress={handleKeyPress}
                                placeholder={gameState.round === 1 ? "Enter a word" : "Enter your guess"}
                                autoFocus
                            />
                            <span hidden className='error-message'>
                                You may not guess a previously guessed word. Please try again.
                            </span>
                            <button 
                                className='main-button' 
                                onClick={handleSubmitGuess} 
                                disabled={!gameState.userInput.trim()}
                            >
                                Guess
                            </button>
                        </div>
                    </div>
                );

            case 'waitingForAI':
                return (
                    <div className="game-controls">
                        {gameState.round > 1 && gameState.prevUserWord && gameState.prevAiWord && (
                            <p className="prompt">
                                Guesses were <span className='guess-words'>{gameState.prevUserWord}</span> and <span className='guess-words'>{gameState.prevAiWord}</span>
                            </p>
                        )}
                        <div className='input-group loading'>
                            <input
                                autoComplete='off'
                                type="text"
                                value={gameState.userInput}
                                placeholder="Guess submitted"
                                disabled
                            />
                            <button className='main-button' disabled>
                                Wait...
                            </button>
                        </div>
                    </div>
                );

            case 'resetting':
                return (
                    <div className="game-controls">
                        <p className="prompt loading">Waiting for AI...</p>
                    </div>
                );

            case 'roundLost':
                return (
                    <div className="game-controls">
                        <p className="prompt">Time's up! You made {gameState.round - 1} guesses.</p>
                        <div className='input-group'>
                            <button className='main-button' onClick={handleStartGame}>
                                Play again?
                            </button>
                        </div>
                    </div>
                );

            case 'roundWon':
                return (
                    <div className="game-controls">
                        <p id="win-count" className="prompt">
                            Melded in {gameState.round} guesses! 
                            <span id="new-words-count">
                                <span className="new-words-badge">★</span> {gameState.newWords.length} new words
                            </span>
                        </p>
                        <div className='input-group'>
                            <button className='main-button' onClick={handleStartGame}>
                                Play again?
                            </button>
                        </div>
                    </div>
                );

            default:
                return null;
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