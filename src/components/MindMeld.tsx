import React, { useState, useEffect, useRef } from 'react';
import OpenAI from "openai";
import { animate, createTimer, stagger, utils } from 'animejs';

const openai = new OpenAI({ apiKey: process.env.REACT_APP_OPENAIKEY, dangerouslyAllowBrowser: true });

// --- Configuration ---
const API_BASE_URL = '/.netlify/functions';

type GameState = 'idle' | 'awaitingUserGuess' | 'waitingForAI' | 'roundWon' | 'roundLost' | 'resetting';

// Use proper type for words in database
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface WordsInDatabase {
	uniqueWords: string[];
}

const MindMeld: React.FC = () => {
	const [userInput, setUserInput] = useState<string>('');
	const [gameMessages, setGameMessages] = useState<string[]>([]);
	const [gameState, setGameState] = useState<GameState>('idle');
	const gameStateRef = useRef<GameState>('idle');
	const [round, setRound] = useState<number>(0);

	const [prevUserWord, setPrevUserWord] = useState<string | null>(null);
	const [prevAiWord, setPrevAiWord] = useState<string | null>(null);
	const [roundResults, setRoundResults] = useState<{ round: number, userGuess: string, aiGuess: string }[]>([]);
	const currentAiGuessRef = useRef<string>('');
	const isGeneratingRef = useRef<boolean>(false);
	
	// Store known words in a Set for efficient lookup
	const [knownWords, setKnownWords] = useState<Set<string>>(new Set());
	// Track new words found in the current round
	const [newWords, setNewWords] = useState<string[]>([]);
	// Track which new words have been animated
	const [animatedNewWords, setAnimatedNewWords] = useState<Set<string>>(new Set());

	const currentAnimation = useRef<any>(null)
	const timer = useRef<any>(null)
	const isStarted = useRef<boolean>(false)

	const $timeSec = utils.$('.time-vals')[0]
	const $timeMil = utils.$('.time_secs')[0]

	const bodyStyles = window.getComputedStyle(document.body);
	const indigo3Value = bodyStyles.getPropertyValue('--color-indigo-3').trim();
	const indigo2Value = bodyStyles.getPropertyValue('--color-indigo-2').trim();
	const indigo1Value = bodyStyles.getPropertyValue('--color-indigo-1').trim();
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const indigo0Value = bodyStyles.getPropertyValue('--color-indigo-0').trim();
	const green1Value = bodyStyles.getPropertyValue('--color-green-1').trim();
	const red1Value = bodyStyles.getPropertyValue('--color-red-1').trim();

	const ROUND_LENGTH = 25000

	const response = async (endpoint: string, options?: RequestInit) => {
		try {
			const fullUrl = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
			console.log(`Fetching API: ${fullUrl}`);
			
			const response = await fetch(fullUrl, options);
			
			// First check if the response is ok
			if (!response.ok) {
				throw new Error(`API error: ${response.status} ${response.statusText}`);
			}
			
			// Check if the content type is JSON
			const contentType = response.headers.get('content-type');
			if (!contentType || !contentType.includes('application/json')) {
				// If we didn't get JSON, log the response text for debugging
				const text = await response.text();
				console.error('Received non-JSON response:', text.substring(0, 100) + '...');
				throw new Error('Received non-JSON response from API');
			}
			
			// Now it's safe to parse JSON
			return await response.json();
		} catch (error) {
			console.error(`Error fetching ${endpoint}:`, error);
			throw error;
		}
	};

	// Animate new word badges sequentially
	const animateNewWordBadges = () => {
		if (newWords.length === 0) return;

		// Animate each new word badge with a delay
		let delay = 500; // Start after 500ms
		const interval = 300; // 300ms between animations

		newWords.forEach((word) => {
			if (animatedNewWords.has(word.toLowerCase())) return; // Skip already animated words
			
			setTimeout(() => {
				// Find all badges for this word and add the visible class
				const elements = document.querySelectorAll(`.new-badge[data-word="${word.toLowerCase()}"]`);
				elements.forEach(el => {
					el.classList.add('visible');
				});
				
				// Update animated words
				setAnimatedNewWords(prev => {
					const updated = new Set(prev);
					updated.add(word.toLowerCase());
					return updated;
				});
			}, delay);
			
			delay += interval;
		});
	};

	// Effect for the timer
	useEffect(() => {
		timer.current?.revert()
		if (round < 1) return;
		timer.current = createTimer({
			duration: ROUND_LENGTH,
			reversed: true,
			frameRate: 16,
			onUpdate: self => {
				if (gameState === 'awaitingUserGuess' && round > 1) {
					$timeSec.innerHTML = (self._iterationTime).toString().substring(0, self._iterationTime.toString().length - 3).padStart(2, '0')
					$timeMil.innerHTML = (self._iterationTime).toString().substring(self._iterationTime.toString().length - 3, self._iterationTime.toString().length - 1).padStart(2, '0')
					if (self._iterationTime <= 5000) {
						utils.$('#timerDisplay')[0].classList.add('time-running-out')
					}
					else {
						utils.$('#timerDisplay')[0].classList.remove('time-running-out')
					}
				}
			},
			onComplete: () => {
				if (gameState === 'awaitingUserGuess' && round > 1) {
					setGameState('roundLost');
					setGameMessages(prev => [...prev, `<span class='prev-words prev-words-user'>${prevUserWord}</span><span class='prev-words prev-words-ai'>${prevAiWord}</span>`])
					animateGrid('roundLost')
				}
			}
		})
	}, [gameState, round, $timeSec, $timeMil]);

	// MARK: Grid Animation
	const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);

	useEffect(() => {
		const handleResize = () => {
			setWindowWidth(window.innerWidth);
		};

		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	const grid = windowWidth < 800 ? [9, 16] : [16, 9];

	function animateGrid(stateAtStart: GameState = 'awaitingUserGuess') {
		const from = utils.random(0, grid[0] * grid[1]);
		const waveDots = utils.$('.wave-dot');
		if (waveDots.length === 0) return;

		let animationDelay = 0
		let animationDuration = 1000
		let animationScale = [0.5, 1.5]
		let animationColor = [indigo3Value, indigo2Value]

		switch (stateAtStart) {
			case 'idle':
				animationDelay = 240
				animationDuration = 2000
				animationScale = [0.9, 1.1]
				animationColor = [indigo3Value, indigo2Value]
				break
			case 'roundWon':
				animationDelay = 100
				animationDuration = 2000
				animationScale = [0.5, 1.5]
				animationColor = [indigo3Value, green1Value]
				break
			case 'roundLost':
				animationDelay = 160
				animationDuration = 4000
				animationScale = [1.1, 0.6]
				animationColor = [indigo3Value, red1Value]
				break
			default:
				animationDelay = 250
				animationDuration = 600
				animationScale = [0.75, 1.25]
				animationColor = [indigo3Value, indigo1Value]
				break
		}
		currentAnimation.current?.revert();
		currentAnimation.current = animate(waveDots, {
			scale: [
				{ to: animationScale[0] },
				{ to: animationScale[1] },
				{ to: 1, ease: 'inSine' }
			],
			backgroundColor: [
				{ to: animationColor[0] },
				{ to: animationColor[1] },
				{ to: animationColor[0], duration: animationDuration*.75 }
			],
			delay: stagger(animationDelay, { grid, from, ease: 'inSine' }),
			duration: animationDuration,
			ease: 'inOutSine',
			onComplete: () => {
				if (gameStateRef.current === 'idle') {
					animateGrid('idle');
				} else if (gameStateRef.current !== 'roundLost' && gameStateRef.current !== 'roundWon') {
					animateGrid(gameStateRef.current);
				}
			}
		})
	}


	// MARK: AI Functions
	const generateAiGuess = async (previousUserWord: string | null, previousAiWord: string | null, warn = ''): Promise<string> => {
		let instructions = `You are playing a word-association game. Your partner is about to guess a word. The goal is for you and your play partner to independently guess the same word.`
		let roundInput = ''
		console.time('Time to generate guess')
		if (previousUserWord && previousAiWord) {
			// const searchWords = `${previousUserWord} + ${previousAiWord}`

			// const response = await fetch(`${API_BASE_URL}/get-rounds?word=${encodeURIComponent(searchWords)}`);
			// const data: { topGuesses: string[], similarity: number[] } = await response.json();
			instructions += `What single word relates to both '${previousUserWord}' and '${previousAiWord}'?` + (warn ? `FORBIDDEN WORDS: ${warn}!` : '')
			// roundInput = `\n\nLikely words based on previous games: ${data.topGuesses?.map((guess, index) => `${guess} (score: ${data.similarity[index]})`).join(', ')} `
		}
		else {
			const seed = 'abcdefghijklmnopqrstuvwy'.split('').sort(() => 0.5 - Math.random()).join('').substring(0, 16)
			const randNum = Math.floor(Math.random() * 5) + 2
			roundInput = `\n\nThis is the first round. Create your word. It should be a single English noun, verb, adverb, or adjective. It must start with the letter '${seed[0]}'. Either the second or third letter must be '${seed[1]}'. Use at least one other letter from the following: '${seed.substring(2)}'. The only exception to these rules is if no words can be made with the assigned letters. In that case, create any word. `
			console.log({seed: `${seed}`, randNum: `${randNum}`})
		}

		instructions += `\n\n# *STRICT RULE: Your response must be only a single word. Do not use any previous round's words.*`


		// Generate guess
		const guess = await openai.responses.create({
			model: "gpt-4.1-mini",
			temperature: 0.9,
			max_output_tokens: 16,
			instructions: instructions,
			input: [{ role: "assistant", content: roundInput }],
		});
		const aiGuess = guess.output_text || 'ERROR: No guess returned'
		if (checkIfPreviouslyUsed(aiGuess,previousUserWord,previousAiWord)) {
			warn = warn.includes(aiGuess) ? warn : `${aiGuess},${warn}`
			console.warn(`Attempting to use previously used word, re-generating...`)
			console.time('Time to re-generate guess')
			return await generateAiGuess(previousUserWord, previousAiWord, warn)
		}
		console.timeEnd('Time to generate guess')
		currentAiGuessRef.current = aiGuess.toLowerCase();
		isGeneratingRef.current = false;
		return aiGuess;
	};

	const checkForMatch = async (userGuess: string, aiGuess: string) => {
		let prompt = `Word 1: ${userGuess}\nWord 2: ${aiGuess}`
		console.time('Time to check for match')
		const guess = await openai.responses.create({
			model: "gpt-4.1-nano",
			temperature: 0.0,
			max_output_tokens: 16,
			instructions: "Determine if the following two words are the same. Ignore capitalization, spacing, and allow for reasonable spelling mistakes. Words which have the same root but are different tenses or grammatical forms may be considered the same, for example 'running' and 'runner', 'jumping' and 'jump', 'perform' and 'performance', 'vote' and 'votes', 'create' and 'creator', etc. would be considered the same. Return only `true` or `false`.",
			input: prompt,
		});
		console.timeEnd('Time to check for match')
		return guess.output_text === 'true';
	};

	// MARK: Game Functions
	const handleStartGame = async () => {
		console.log('Starting game')
		setRound(1);
		setGameState('resetting');
		let newAiGuess = await generateAiGuess(null, null);
		currentAiGuessRef.current = newAiGuess.toLowerCase();
		setGameState('awaitingUserGuess');
		setPrevUserWord(null);
		setPrevAiWord(null);
		setGameMessages(['Enter any word to begin.']);
		setRoundResults([])
		setUserInput('');
		setNewWords([]);
		setAnimatedNewWords(new Set());
		animateGrid()
	};

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setUserInput(event.target.value.toLowerCase());
		if (event.target.classList.contains('error')) {
			event.target.classList.remove('error')
			utils.$('.error-message')[0].classList.add('hidden')
		}
	};

	const checkIfPreviouslyUsed = (checkedWord: string, ...args: any[]) => {
		checkedWord = checkedWord.toLowerCase()
		const roundWords = [roundResults.map(result => result.userGuess), roundResults.map(result => result.aiGuess), ...args].flat()
		const suffixes = ['s', 'es', 'ed', 'ing', 'ly', 'ate', 'ion', 'r', 'red', 'ring', 'led'];
		const isExcluded = roundWords.some(w => {
			if (checkedWord === w || w === checkedWord) return true;
			for (const suffix of suffixes) {
				if (checkedWord === w + suffix || w === checkedWord + suffix) {
					return true;	
				}
			}
			return false;
		});
		return isExcluded;
	}

	// MARK: Handle Guess
	const handleSubmitGuess = async () => {
		if (gameState !== 'awaitingUserGuess' || !userInput.trim()) return;
		setGameState('resetting');

		if (checkIfPreviouslyUsed(userInput.trim())) {
			setGameState('awaitingUserGuess');
			const input = utils.$('#user-input')[0]
			input.classList.add('error')
			utils.$('.error-message')[0].classList.remove('hidden')
			return;
		}
		const currentUserGuess = userInput.trim().toLowerCase();
		setUserInput('');

		while (isGeneratingRef.current) {
			setGameState('waitingForAI');
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		try {
			isGeneratingRef.current = true;
			const turnMessages = roundResults.length > 0 ? roundResults.map(result => `<span class='prev-words prev-words-user'>${result.userGuess}</span><span class='prev-words prev-words-ai'>${result.aiGuess}</span>`) : ['First round.'];

			if (await checkForMatch(currentUserGuess, currentAiGuessRef.current)) {
				// Round is won, now check which words are new
				try {
					console.time('Time to fetch words')
					const data = await response('get-all-words');
					console.timeEnd('Time to fetch words')
					console.log("Words from database:", data);
					if (data && data.uniqueWords) {
						const validWords = data.uniqueWords.filter((word: string | null) => word !== null)
							.map((word: string) => word.toLowerCase());
						console.log("Previous words:", validWords);
						setKnownWords(new Set(validWords));
						
						// Identify all new words from this round
						const newWordsFound: string[] = [];
						// Check all user and AI guesses from this round
						for (const result of roundResults) {
							const userWordLower = result.userGuess.toLowerCase();
							const aiWordLower = result.aiGuess.toLowerCase();
							
							if (!validWords.includes(userWordLower)) {
								newWordsFound.push(result.userGuess);
							}
							if (!validWords.includes(aiWordLower)) {
								newWordsFound.push(result.aiGuess);
							}
						}
						// Check the final matching word
						const finalWordLower = currentUserGuess.toLowerCase();
						if (!validWords.includes(finalWordLower)) {
							newWordsFound.push(currentUserGuess);
						}
						
						console.log("New words found:", newWordsFound);
						// Update state with new words
						setNewWords(newWordsFound);
						
						// Generate HTML with new word badges that will be animated
						const finalMessages = roundResults.map(result => {
							const userWordClass = 'prev-words prev-words-user';
							const aiWordClass = 'prev-words prev-words-ai';
							
							const userWordHtml = !validWords.includes(result.userGuess.toLowerCase()) 
								? `<span class='${userWordClass}'>${result.userGuess}<span class="new-badge" data-word="${result.userGuess.toLowerCase()}">★</span></span>` 
								: `<span class='${userWordClass}'>${result.userGuess}</span>`;
								
							const aiWordHtml = !validWords.includes(result.aiGuess.toLowerCase()) 
								? `<span class='${aiWordClass}'>${result.aiGuess}<span class="new-badge" data-word="${result.aiGuess.toLowerCase()}">★</span></span>` 
								: `<span class='${aiWordClass}'>${result.aiGuess}</span>`;
							
							return `${userWordHtml}${aiWordHtml}`;
						});
						
						const matchClass = 'prev-words prev-words-match';
						const matchHtml = !validWords.includes(currentUserGuess.toLowerCase()) 
							? `<span class='${matchClass}'>${currentUserGuess}<span class="new-badge" data-word="${currentUserGuess.toLowerCase()}">★</span></span>` 
							: `<span class='${matchClass}'>${currentUserGuess}</span>`;

						console.log({finalMessages: finalMessages.concat(matchHtml)})
							
						setGameMessages(finalMessages.concat(matchHtml));
					}
				} catch (error) {
					console.error("Failed to check for new words:", error);
					// If we can't check for new words, just show the match without new indicators
					setGameMessages(turnMessages.concat(`<span class='prev-words prev-words-match'>${currentUserGuess}</span>`));
				}
				
				setGameState('roundWon');
				animateGrid('roundWon')
				setRoundResults(prev => [...prev, { round: round, userGuess: currentUserGuess, aiGuess: currentAiGuessRef.current }]);
				await recordRoundToDatabase(currentUserGuess);
				isGeneratingRef.current = false;
				
				// Schedule animation of new word badges
				setTimeout(animateNewWordBadges, 1000);
			} else {
				// Append to previous words
				setRoundResults(prev => [...prev, { round: round, userGuess: currentUserGuess, aiGuess: currentAiGuessRef.current }]);
				setPrevUserWord(currentUserGuess);
				setPrevAiWord(currentAiGuessRef.current);
				
				setGameMessages(turnMessages);
				setRound(prev => prev + 1);
				
				setGameState('resetting');
				setGameState('awaitingUserGuess');

				// Generate new AI guess
				generateAiGuess(currentUserGuess, currentAiGuessRef.current)
			}
		} catch (error) {
			console.error("Error getting AI guess:", error);
			setGameMessages(prev => [...prev, "Error communicating with AI. Please try again."]);
			setGameState('awaitingUserGuess');
		}
	};

	const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			handleSubmitGuess();
		}
	};


	// MARK: Database -> Now handled by backend
	const recordRoundToDatabase = async (finalCorrectGuess: string) => {
		console.time('Time to record round to database')
		try {
			const response = await fetch(`${API_BASE_URL}/record-round`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ roundResults: roundResults, finalCorrectGuess: finalCorrectGuess })
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

		} catch (error) {
			console.error("Error sending data to backend API:", error);
		}
		console.timeEnd('Time to record round to database')
	}

	// MARK: Effect Hooks
	// Call animateGrid once on component load
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		if (!isStarted.current) {
			isStarted.current = true;
			animateGrid('idle');
		}
	}, []);

	useEffect(() => {
		gameStateRef.current = gameState;
	}, [gameState]);

	// Effect to animate new words when the game state changes to roundWon
	useEffect(() => {
		if (gameState === 'roundWon') {
			setTimeout(animateNewWordBadges, 1000);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [gameState]);

	// MARK: Render
	return (
		<div className="mind-meld-game">
			<h2>MIndmeld</h2>
			<div className="game-area">
				<div className="message-display">
					<span className='prev-words-container'>
						{gameMessages.length > 0 ? gameMessages.map((msg, index) => (
							<div className='prev-words-group' key={index} dangerouslySetInnerHTML={{ __html: msg }}></div>
						)) : (
							<p className='subtitle'>Guess the same word as your AI partner.</p>
						)}
					</span>
				</div>

				<div className='timer' hidden={gameState !== 'awaitingUserGuess' || round < 2}>You have <span id="timerDisplay"><span className='time-vals'>25</span>:<span className='time_secs time-vals'>00</span></span> left to guess.</div>

				{gameState === 'idle' && (
					<div className="game-controls">
						<div className='input-group'>
							<button className='main-button' onClick={handleStartGame}>Start Game</button>
						</div>
					</div>
				)}

				{(gameState === 'awaitingUserGuess') && (
					<div className="game-controls">
						{round > 1 && prevUserWord && prevAiWord && (
							<p className="prompt">
								Guesses were <span className='guess-words'>{prevUserWord}</span> and <span className='guess-words'>{prevAiWord}</span>
							</p>
						)}
						<div className='input-group'>
							<input
								autoComplete='off'
								id="user-input"
								type="text"
								maxLength={32}
								value={userInput}
								onChange={handleInputChange}
								onKeyPress={handleKeyPress}
								placeholder={round === 1 ? "Enter a word" : "Enter your guess"}
								autoFocus
							/>
							<span hidden className='error-message'>You may not guess a previously guessed word. Please try again.</span>
							<button className='main-button' onClick={handleSubmitGuess} disabled={!userInput.trim()}>
								Guess
							</button>
						</div>
					</div>
				)}

				{(gameState === 'waitingForAI') && (
					<div className="game-controls">
						{round > 1 && prevUserWord && prevAiWord && (
							<p className="prompt">
								Guesses were <span className='guess-words'>{prevUserWord}</span> and <span className='guess-words'>{prevAiWord}</span>
							</p>
						)}
						<div className='input-group loading'>
							<input
								autoComplete='off'
								type="text"
								value={userInput}
								placeholder={"Guess submitted"}
								disabled
							/>
							<button className='main-button' disabled>
								Wait...
							</button>
						</div>
					</div>
				)}

				{gameState === 'resetting' && (
					<div className="game-controls">
						<p className="prompt loading">Waiting for AI...</p>
					</div>
				)}

				{gameState === 'roundLost' && (
					<div className="game-controls">
						<p className="prompt">Time's up! You made {round - 1} guesses.</p>
						<div className='input-group'>
							<button className='main-button' onClick={handleStartGame}>Play again?</button>
						</div>
					</div>
				)}

				{gameState === 'roundWon' && (
					<div className="game-controls">
						<p id="win-count" className="prompt">Melded in {round} guesses! <span id="new-words-count"><span className="new-words-badge">★</span> {newWords.length} new words</span></p>
						<div className='input-group'>
							<button className='main-button' onClick={handleStartGame}>Play again?</button>
						</div>
					</div>
				)}
			</div>
			<div className='wave-container'>
				{Array.from({ length: grid[0] * grid[1] }).map((_, index) => (
					<span key={index} className='wave-dot'></span>
				))}
			</div>
		</div>
	);
};

export default MindMeld; 