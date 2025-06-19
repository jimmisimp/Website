export const gameIdle = (handleStartGame: () => void) => (
	<div className="game-controls" >
		<div className='input-group'>
			<button className='main-button' onClick={handleStartGame}>
				Start Game
			</button>
		</div>
	</div >
)

export const gameAwaitingUserGuess = (handleSubmitGuess: () => void, handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void, round: number, prevUserWord: string, prevAiWord: string, userInput: string, handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void) => (
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
				onKeyDown={handleKeyPress}
				placeholder={round === 1 ? "Enter a word" : "Enter your guess"}
				autoFocus
			/>
			
			<button
				className='main-button'
				onClick={handleSubmitGuess}
				disabled={!userInput.trim()}
			>
				Guess
			</button>
		</div>
		<span hidden id='input-error' className='error-message'>
			Error message.
		</span>
	</div>
)

export const gameWaitingForAI = (round: number, prevUserWord: string, prevAiWord: string, userInput: string) => (
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
				placeholder="Guess submitted"
				disabled
			/>
			<button className='main-button' disabled>
				Wait...
			</button>
		</div>
	</div>
)

export const gameAwaitingRoundWon = () => (
	<div className="game-controls">
		<p id="win-count" className="prompt">
			Waiting for results...
		</p>
	</div>
)

export const gameResetting = () => (
	<div className="game-controls">
		<p className="prompt loading">Waiting for AI...</p>
	</div>
)

export const gameRoundLost = (handleStartGame: () => void, round: number) => (
	<div className="game-controls">
		<p className="prompt">Time's up! You made {round - 1} guesses.</p>
		<div className='input-group'>
			<button className='main-button' onClick={handleStartGame}>
				Play again?
			</button>
		</div>
	</div>
)

export const gameRoundWon = (handleStartGame: () => void, round: number, newWords: string[]) => (
	<div className="game-controls">
		<p id="win-count" className="prompt">
			Melded in {round} guesses!
			<span id="new-words-count">
				<span className="new-words-badge">★</span> {newWords.length} new words
			</span>
		</p>
		<div className='input-group'>
			<button className='main-button' onClick={handleStartGame}>
				Play again?
			</button>
		</div>
	</div>
)
