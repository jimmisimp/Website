import React, { useRef, useEffect, useState } from 'react';
import { GameState } from './types';
import { animate, stagger, utils } from 'animejs';

interface AnimatedGridProps {
	gameState: GameState;
}

const bodyStyles = window.getComputedStyle(document.body);
const indigo3Value = bodyStyles.getPropertyValue('--color-indigo-3').trim();
const indigo2Value = bodyStyles.getPropertyValue('--color-indigo-2').trim();
const indigo1Value = bodyStyles.getPropertyValue('--color-indigo-1').trim();
const indigo0Value = bodyStyles.getPropertyValue('--color-indigo-0').trim();
const green1Value = bodyStyles.getPropertyValue('--color-green-1').trim();
const red1Value = bodyStyles.getPropertyValue('--color-red-1').trim();

const AnimatedGrid: React.FC<AnimatedGridProps> = ({ gameState }) => {
	const currentAnimation = useRef<any>(null)
	const isStarted = useRef(false);
	const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
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
				{ to: animationColor[0], duration: animationDuration * .75 }
			],
			delay: stagger(animationDelay, { grid, from, ease: 'inSine' }),
			duration: animationDuration,
			ease: 'inOutSine',
			onComplete: () => {
				if (gameState === 'idle') {
					animateGrid('idle');
				} else if (gameState !== 'roundLost' && gameState !== 'roundWon') {
					animateGrid(gameState);
				}
			}
		})
	}

	useEffect(() => {
		if (!isStarted.current) {
			isStarted.current = true;
			animateGrid('idle');
		}
	}, []);

	useEffect(() => {
		animateGrid(gameState);
	}, [gameState]);

	useEffect(() => {
		const handleResize = () => {
			setWindowWidth(window.innerWidth);
		};

		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	return (
		<div className='wave-container'>
			{Array.from({ length: grid[0] * grid[1] }).map((_, index) => (
				<span key={index} className='wave-dot'></span>
			))}
		</div>
	)
}

export default AnimatedGrid; 