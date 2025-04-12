import React, { useState, useEffect, useRef } from 'react';
import OpenAI from "openai";
import anime, { easings } from 'animejs';

const openai = new OpenAI({ apiKey: process.env.REACT_APP_OPENAIKEY, dangerouslyAllowBrowser: true });

type GameState = 'idle' | 'awaitingUserGuess' | 'waitingForAI' | 'roundWon' | 'roundLost' | 'resetting';


const MindMeld: React.FC = () => {
	const [userInput, setUserInput] = useState<string>('');
	const [gameMessages, setGameMessages] = useState<string[]>([]);
	const [gameState, setGameState] = useState<GameState>('idle');
	const gameStateRef = useRef<GameState>('idle');
	const [round, setRound] = useState<number>(0);

	const [prevUserWord, setPrevUserWord] = useState<string | null>(null);
	const [prevAiWord, setPrevAiWord] = useState<string | null>(null);
	const [roundResults, setRoundResults] = useState<{ round: number, userGuess: string, aiGuess: string, thoughts: string }[]>([]);

	const timer = useRef<any>(null);
	const currentAnimation = useRef<any>(null)

	let didInit = false;

	useEffect(() => {
		gameStateRef.current = gameState;
	}, [gameState]);


	// MARK: Grid Animation
	// add window size check
	// const grid = [24, 24]
	// Responsive grid size based on window width
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
	
	const grid = windowWidth < 800 ? [24, 24] : [32, 18];

	function animateGrid(stateAtStart: GameState = 'awaitingUserGuess') {
		const from = anime.random(0, grid[0] * grid[1]);
		const waveDots = document.querySelectorAll('.wave-dot');
		if (waveDots.length === 0) return;

		let animationDelay = 0
		let animationDuration = 1000
		let animationTranslate = '0rem'
		let animationScale = [1, 1]
		let animationColor = ['#4e4e9e', '#717aff']
		let currentScale = 1;

		try {
			const firstDot = waveDots[0] as HTMLElement;
			const computedStyle = window.getComputedStyle(firstDot);
			const transformMatrix = computedStyle.transform || computedStyle.webkitTransform;
			if (transformMatrix && transformMatrix !== 'none') {
				const matrixValues = transformMatrix.match(/matrix.*\((.+)\)/);
				if (matrixValues && matrixValues[1]) {
					const values = matrixValues[1].split(',').map(parseFloat);
					currentScale = values[0];
				}
			} else {
				const scaleAttr = firstDot.style.transform.match(/scale\(([^)]+)\)/);
				if (scaleAttr && scaleAttr[1]) {
					currentScale = parseFloat(scaleAttr[1]);
				}
			}
			currentScale = isNaN(currentScale) ? 1 : currentScale;

		} catch (e) {
			console.error("Could not get current scale:", e);
			currentScale = 1;
		}

		switch (stateAtStart) {
			case 'idle':
				animationDelay = 200
				animationDuration = 4000
				animationTranslate = '0.15rem'
				animationScale = [currentScale, 1.25]
				animationColor = ['#4e4e9e', '#5e5eae']
				break
			case 'roundWon':
				animationDelay = 15
				animationDuration = 2000
				animationTranslate = '1rem'
				animationScale = [currentScale, 3]
				animationColor = ['#4e4e9e', '#717aff']
				break
			case 'roundLost':
				animationDelay = 200
				animationDuration = 4000
				animationTranslate = '0.15rem'
				animationScale = [currentScale, 0.66]
				animationColor = ['#4e4e9e', '#ff4c4c']
				break
			default:
				animationDelay = 20
				animationDuration = 1200
				animationTranslate = '0.25rem'
				animationScale = [currentScale, 2]
				animationColor = ['#4e4e9e', '#5e5eae']
				break
		}
		currentAnimation.current?.pause();
		currentAnimation.current = anime({
			targets: waveDots,
			translateX: [
				{ value: anime.stagger(animationTranslate, { grid, from, axis: 'x' }), duration: animationDuration / 2 + 300, easing: 'easeInOutSine' },
				{ value: 0, duration: animationDuration / 2 - 300, easing: 'easeInCirc' }
			],
			translateY: [
				{ value: anime.stagger(animationTranslate, { grid, from, axis: 'y' }), duration: animationDuration / 2 + 300, easing: 'easeInOutSine' },
				{ value: 0, duration: animationDuration / 2 - 300, easing: 'easeInCirc' }
			],
			scale: [
				{ value: animationScale, duration: animationDuration / 2 + 300, easing: 'easeInOutSine' },
				{ value: 1, duration: animationDuration / 2 - 300, easing: 'easeInCirc' }
			],
			backgroundColor: [
				{ value: animationColor, duration: animationDuration / 2 + 300, easing: 'easeInOutSine' },
				{ value: animationColor[0], duration: animationDuration / 2 - 300, easing: 'easeInCirc' }
			],
			delay: anime.stagger(animationDelay, { grid, from }),
			duration: animationDuration,
			easing: 'linear',
			complete: () => {
				if (gameStateRef.current !== 'roundLost' && gameStateRef.current !== 'roundWon') {
					animateGrid(gameStateRef.current)
				}
				else {
					animateGrid('idle')
				}
			}
		})
	}


	// MARK: AI Functions
	const generateAiGuess = async (previousUserWord: string | null, previousAiWord: string | null, warn = ''): Promise<string> => {
		let prompt = `You are playing a game. Your partner is about to guess a word. The goal is for you and your play partner to guess the same word.`
		let agentPrompt = ''
		if (previousUserWord && previousAiWord) {
			const searchWords = `${previousUserWord} + ${previousAiWord}`
			const response = await fetch(`http://localhost:3001/api/get-rounds?word=${searchWords}`);

			const data: { topGuesses: string[], similarity: number[] } = await response.json();
			console.log(data);

			prompt += `\n\nWhat word will the user likely guess next, based on the words '${previousUserWord}' and '${previousAiWord}'?` + (warn ? `FORBIDDEN WORDS: ${warn}!` : '')
			agentPrompt = roundResults.length > 0 ? `\n\n*Top 3 most likely based on previous games: ${data.topGuesses.map((guess, index) => `${guess} (score: ${data.similarity[index]})`).join(', ')}* \n\nPrevious round analysis: \n\n${roundResults.slice(-3, -1).map(result => `Why the user might have chosen ${result.userGuess}: ${result.thoughts}`).join('\n\n')} ` : ''
		}
		else {
			const seed = 'abcdefghijklmnopqrstuvwy'.split('').sort(() => 0.5 - Math.random()).join('').substring(0, 16)
			const randNum = Math.floor(Math.random() * 5) + 2
			agentPrompt = `\n\nThis is the first round. Create your word. It must start with the letter '${seed[0]}'. Either the second or third letter must be '${seed[1]}'. Use at least ${randNum - 2} other letters from the following: '${seed.substring(2)}' `
		}

		prompt += `\n\n# *STRICT RULE: Your response must contain only a single word, no other text. Never use any previous round's words.*`
		console.log(agentPrompt)

		// Generate guess
		const guess = await openai.chat.completions.create({
			model: "gpt-4o",
			temperature: 0.9,
			top_p: 1.0,
			max_tokens: 12,
			messages: [{ role: "system", content: prompt }, { role: "system", content: agentPrompt }],
		});
		const aiGuess = guess.choices[0].message.content || 'ERROR: No guess returned'
		console.log(`AI guessed: ${aiGuess}`);
		if (checkIfPreviouslyUsed(aiGuess)) {
			console.log(`Already used ${aiGuess} ${warn}`)
			return await generateAiGuess(previousUserWord, previousAiWord, `${aiGuess},${warn}`)
		}
		return aiGuess;
	};

	const checkForMatch = async (userGuess: string, aiGuess: string) => {
		let prompt = `Word 1: ${userGuess}\nWord 2: ${aiGuess}`
		const guess = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			temperature: 0.0,
			max_tokens: 5,
			messages: [{ role: "system", content: "Determine if the following two words are the same. Ignore capitalization, spacing, and allow for reasonable spelling mistakes. Words which have the same root but are different tenses or forms may be considered the same (e.g. 'running' and 'runner', 'jumping' and 'jump', etc.). Return only `true` or `false`." }, { role: "user", content: prompt }],
		});

		return guess.choices[0].message.content === 'true';
	};

	const getThoughts = async (userGuess: string, aiGuess: string): Promise<string> => {
		let prompt = `Previous rounds: \n\n` + `${prevUserWord} + ${prevAiWord}` + `\n\nThis round user guess: ${userGuess}\nThis round AI guess: ${aiGuess}`
		const thoughts = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			temperature: 0.25,
			max_tokens: 50,
			top_p: 0.95,
			messages: [{ role: "system", content: "Both players are attempting to guess the same word. Before each guess, they see the previous round's guesses, and attempt again to match. Generate your thoughts on why the User choose the word they did this round. Think of clever connections or tactics they may be using. Return only the thoughts, no other text. Your thoughts should be under 24 words." }, { role: "assistant", content: prompt }],
		});
		console.log(prompt)
		console.log(thoughts.choices[0].message.content);
		return thoughts.choices[0].message.content || 'ERROR: No thoughts returned';
	};

	// MARK: Game Functions
	const handleStartGame = () => {
		setRound(1);
		setGameState('awaitingUserGuess');
		setPrevUserWord(null);
		setPrevAiWord(null);
		setGameMessages(['Enter any word to begin.']);
		setRoundResults([])
		setUserInput('');
		console.log('Starting Mind Meld game...');
		animateGrid()
	};

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setUserInput(event.target.value.toLowerCase());
	};

	const checkIfPreviouslyUsed = (guess: string) => {
		guess = guess.toLowerCase()
		if (roundResults.some(result => result.userGuess === guess || result.aiGuess === guess)) {
			return true;
		}
		return false;
	}

	// MARK: Handle Guess
	const handleSubmitGuess = async () => {
		if (gameState !== 'awaitingUserGuess' || !userInput.trim()) return;

		if (checkIfPreviouslyUsed(userInput.trim().toLowerCase())) {
			setGameMessages(prev => [...prev, "You may not guess a previously guessed word. Please try again."]);
			setGameState('awaitingUserGuess');
			return;
		}

		const currentUserGuess = userInput.trim().toLowerCase();
		setUserInput('');
		setGameState('waitingForAI');

		try {
			let currentAiGuess = await generateAiGuess(prevUserWord, prevAiWord);
			currentAiGuess = currentAiGuess.toLowerCase();

			const turnMessages = roundResults.length > 0 ? roundResults.map(result => `<span class='prev-words prev-words-user'>${result.userGuess}</span><span class='prev-words prev-words-ai'>${result.aiGuess}</span>`) : ['Words chosen at random.'];

			if (await checkForMatch(currentUserGuess, currentAiGuess)) {
				setGameMessages(turnMessages.concat(`<span class='prev-words prev-words-match'>${currentUserGuess}</span>`));
				setGameState('roundWon');
				animateGrid('roundWon')
				setRoundResults(prev => [...prev, { round: round, userGuess: currentUserGuess, aiGuess: currentAiGuess, thoughts: 'Winning round!' }]);
				await recordRoundToDatabase();
			} else {
				// Append to previous words
				let roundThoughts = 'First round. Words chosen at random.'
				if (round > 1) {
					roundThoughts = await getThoughts(currentUserGuess, currentAiGuess);
				}
				setGameState('resetting');
				setGameMessages(turnMessages);
				setRoundResults(prev => [...prev, { round: round, userGuess: currentUserGuess, aiGuess: currentAiGuess, thoughts: roundThoughts }]);
				setPrevUserWord(currentUserGuess);
				setPrevAiWord(currentAiGuess);
				setRound(prev => prev + 1);
				setGameState('awaitingUserGuess');
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
	const recordRoundToDatabase = async () => {
		console.log("Sending round results to backend API...");
		try {
			const response = await fetch('http://localhost:3001/api/record-round', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ roundResults: roundResults })
			});

			if (!response.ok) {
				let errorData;
				try {
					errorData = await response.json();
				} catch (parseError) {
					throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
				}
				throw new Error(`Backend error: ${errorData.message || response.statusText}`);
			}

			const result = await response.json();
			console.log("Backend response:", result.message);

		} catch (error) {
			console.error("Error sending data to backend API:", error);
		}
	}

	// Call animateGrid once on component load
	useEffect(() => {
		if (!didInit) {
			animateGrid('idle');
			didInit = true;
		}
	}, []);

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
							<p className='subtitle'>First, both players will submit a word. Each round, players will see each other's guesses, and attempt to guess what the other player will submit next. See how quickly you can converge.</p>
						)}
					</span>
				</div>

				<div className='timer' hidden={gameState !== 'awaitingUserGuess' || round < 2}>You have <span id="timerDisplay"><span className='time-vals'>20</span>:<span className='time_secs time-vals'>00</span></span> left to guess.</div>

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
								type="text"
								value={userInput}
								onChange={handleInputChange}
								onKeyPress={handleKeyPress}
								placeholder={round === 1 ? "Enter a word" : "Enter your guess"}
								autoFocus
							/>
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
								<p className='timer'>AI is thinking...</p>
							</p>
						)}
						<div className='input-group'>
							<input
								type="text"
								value={userInput}
								placeholder={"Guess submitted"}
								disabled
							/>
							<button className='main-button' disabled>
								Waiting...
							</button>
						</div>
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
						<p className="prompt">Converged in {round} guesses!</p>
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