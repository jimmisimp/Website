import { useState, useEffect, useRef } from 'react';
import { animate, stagger, utils } from 'animejs';
import { GameState, ColorTheme, GridConfig } from '../types/game-types';

export const useAnimation = (gameState: GameState, colors: ColorTheme) => {
    const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
    const currentAnimation = useRef<any>(null);

    const gridConfig: GridConfig = {
        mobile: [9, 16],
        desktop: [16, 9],
        breakpoint: 800
    };

    const grid = windowWidth < gridConfig.breakpoint ? gridConfig.mobile : gridConfig.desktop;

    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const getAnimationConfig = (stateAtStart: GameState) => {
        switch (stateAtStart) {
            case 'idle':
                return {
                    delay: 240,
                    duration: 2000,
                    scale: [0.9, 1.1] as [number, number],
                    color: [colors.indigo3, colors.indigo2] as [string, string]
                };
            case 'roundWon':
                return {
                    delay: 100,
                    duration: 2000,
                    scale: [0.5, 1.5] as [number, number],
                    color: [colors.indigo3, colors.green1] as [string, string]
                };
            case 'roundLost':
                return {
                    delay: 160,
                    duration: 4000,
                    scale: [1.1, 0.6] as [number, number],
                    color: [colors.indigo3, colors.red1] as [string, string]
                };
            default:
                return {
                    delay: 250,
                    duration: 600,
                    scale: [0.75, 1.25] as [number, number],
                    color: [colors.indigo3, colors.indigo1] as [string, string]
                };
        }
    };

    const animateGrid = (stateAtStart: GameState = 'awaitingUserGuess') => {
        const from = utils.random(0, grid[0] * grid[1]);
        const waveDots = utils.$('.wave-dot');
        if (waveDots.length === 0) return;

        const config = getAnimationConfig(stateAtStart);

        currentAnimation.current?.revert();
        currentAnimation.current = animate(waveDots, {
            scale: [
                { to: config.scale[0] },
                { to: config.scale[1] },
                { to: 1, ease: 'inSine' }
            ],
            backgroundColor: [
                { to: config.color[0] },
                { to: config.color[1] },
                { to: config.color[0], duration: config.duration * 0.75 }
            ],
            delay: stagger(config.delay, { grid, from, ease: 'inSine' }),
            duration: config.duration,
            ease: 'inOutSine',
            onComplete: () => {
                if (gameState === 'idle') {
                    animateGrid('idle');
                } else if (gameState !== 'roundLost' && gameState !== 'roundWon') {
                    animateGrid(gameState);
                }
            }
        });
    };

    const animateNewWordBadges = (newWords: string[], animatedNewWords: Set<string>) => {
        if (newWords.length === 0) return;

        let delay = 500;
        const interval = 300;

        newWords.forEach((word) => {
            if (animatedNewWords.has(word.toLowerCase())) return;
            
            setTimeout(() => {
                const elements = document.querySelectorAll(`.new-badge[data-word="${word.toLowerCase()}"]`);
                elements.forEach(el => {
                    el.classList.add('visible');
                });
            }, delay);
            
            delay += interval;
        });
    };

    return {
        grid,
        animateGrid,
        animateNewWordBadges,
        windowWidth
    };
}; 