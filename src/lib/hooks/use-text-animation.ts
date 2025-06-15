import { useCallback } from 'react';

interface TextAnimationProps {
    text: string;
    setText: (text: string) => void;
    scrollRef?: React.RefObject<HTMLDivElement>;
    updateFeedItem?: (id: string, update: any) => void;
    chunkSize?: number;
    delay?: number;
}

export const useTextAnimation = (textId: string) => {
    const animateText = useCallback(async ({ 
        text, 
        setText, 
        scrollRef, 
        updateFeedItem, 
        chunkSize = 5, 
        delay = 5 
    }: TextAnimationProps) => {
        let maxDelay = 0;
        
        for (let i = 0; i < text.length + chunkSize; i += chunkSize) {
            const currentDelay = i * delay;
            maxDelay = Math.max(maxDelay, currentDelay);
            
            setTimeout(() => {
                const currentText = text.length - i >= 0 ? text.substring(0, i) : text;
                setText(currentText);
                
                if (updateFeedItem) {
                    updateFeedItem(textId, { content: currentText });
                }
            }, currentDelay);
        }
        
        setTimeout(() => { 
            scrollRef?.current?.scrollIntoView({ behavior: 'smooth' }); 
        }, 100);

        return new Promise<void>(resolve => {
            setTimeout(() => {
                resolve();
            }, maxDelay + 1500);
        });
    }, []);

    return { animateText };
}; 