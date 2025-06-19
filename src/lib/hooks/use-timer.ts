import { useEffect, useRef } from 'react';
import { createTimer, utils } from 'animejs';
import { GameState } from '../types/game-types';

export const useTimer = (
    gameState: GameState, 
    round: number, 
    roundLength: number,
    onTimeUp: () => void
) => {
    const timer = useRef<any>(null);
    const gameStateRef = useRef<GameState>(gameState);
    const roundRef = useRef<number>(round);
    const onTimeUpRef = useRef(onTimeUp);
    
    // Update refs on every render
    gameStateRef.current = gameState;
    roundRef.current = round;
    onTimeUpRef.current = onTimeUp;

    useEffect(() => {
        timer.current?.revert();
        if (round < 1) return;

        timer.current = createTimer({
            duration: roundLength,
            reversed: true,
            frameRate: 16,
            onUpdate: self => {
                if (gameStateRef.current === 'awaitingUserGuess' && roundRef.current > 1) {
                    const $timeSec = utils.$('.time-vals')[0];
                    const $timeMil = utils.$('.time_secs')[0];
                    
                    const timeString = self._iterationTime.toString();
                    const seconds = timeString.substring(0, timeString.length - 3).padStart(2, '0');
                    const milliseconds = timeString.substring(timeString.length - 3, timeString.length - 1).padStart(2, '0');
                    
                    if ($timeSec) $timeSec.innerHTML = seconds;
                    if ($timeMil) $timeMil.innerHTML = milliseconds;
                    
                    const timerDisplay = utils.$('#timerDisplay')[0];
                    if (timerDisplay) {
                        if (self._iterationTime <= 5000) {
                            timerDisplay.classList.add('time-running-out');
                        } else {
                            timerDisplay.classList.remove('time-running-out');
                        }
                    }
                }
            },
            onComplete: () => {
                if (gameStateRef.current === 'awaitingUserGuess' && roundRef.current > 1) {
                    onTimeUpRef.current();
                }
            }
        });

        return () => {
            timer.current?.revert();
        };
    }, [round, roundLength]);

    return {
        timer: timer.current
    };
}; 