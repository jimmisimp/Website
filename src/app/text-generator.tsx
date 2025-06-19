import React, { useRef } from 'react';
import { useFeedItems, useColorUtils, useOpenAI } from '@/lib/hooks';
import { ColorPalette } from '@/lib/types';
import { GeneratingItem, FormItem, TextItem, PaletteItem, ButtonItem } from '@/lib/components';

const animateText = (text: string, setText: (text: string) => void, delay: number = 80) => {
    return new Promise<void>((resolve) => {
        let i = 0;
        const interval = setInterval(() => {
            if (i <= text.length) {
                setText(text.slice(0, i*5));
                i+=5;
            } else {
                setText(text);
                clearInterval(interval);
                resolve();
            }
        }, delay);
    });
};

export const TextGenerator = () => {
    const { getTextColor } = useColorUtils();
    const { feedItems, addFeedItem, updateFeedItem, removeFeedItem, generateId } = useFeedItems();
    const { generateColorPalette, generateText } = useOpenAI();
    const scrollRef = useRef<HTMLInputElement>(null);
    const lastResponseID = useRef<string | null | undefined>(null);

    // Handler for the color form
    const createColor = async (e: React.FormEvent<HTMLFormElement>, formId: string) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const input = form.querySelector('input[name="colorInput"]') as HTMLInputElement;
        const inputValue = input?.value || '';

        if (!inputValue || inputValue.length === 0) return;

        // Disable the form
        document.getElementById(formId)?.setAttribute('disabled', 'disabled');

        // Add a generating feed item
        const genId = generateId();
        addFeedItem({ id: genId, type: 'generating', message: '' });

        await animateText(
            "Generating a color palette...",
            (text: string) => updateFeedItem(genId, { message: text })
        );

        // Generate color palette
        let paletteMain: string = '';
        const responseID = await generateColorPalette({
            input: inputValue,
            onPalette: (palette: ColorPalette) => {
                // Remove the generating item
                removeFeedItem(genId);
                // Add the palette
                const paletteId = generateId();
                addFeedItem({ id: paletteId, type: 'palette', data: palette });
                paletteMain = palette.colors[0].hex;
            },
            scrollRef,
            lastResponseID: lastResponseID.current || undefined
        });
        lastResponseID.current = responseID;

        const textId = generateId();
        addFeedItem({ id: textId, type: 'text', content: '' });

        await generateText({
            setText: (text: string) => updateFeedItem(textId, { content: text }),
            scrollRef,
            onDone: () => updateFeedItem(textId, { isLoading: false }),
            onAfter: () => {
                lastResponseID.current = responseID;
            },
            instructions: "Give a sentence about how nice the palette is. Be witty and sarcastic while bragging about how good the palette is. Don't be too cutesy or inappropiate.",
            lastResponseID: lastResponseID.current || undefined
        });

        const textId2 = generateId();
        addFeedItem({ id: textId2, type: 'text', content: '' });

        await animateText(
            "How fun... Actually, I made a game too. Try it out. The AI isn't me, and it's not very Adam-centric. But it's fun.",
            (text: string) => updateFeedItem(textId2, { content: text })
        );

        addFeedItem({
            id: generateId(),
            type: 'button',
            text: 'Play MindMeld',
            onClick: () => {
                window.open('https://adamyuras.com/mindmeld', '_blank');
            }
        });

        const textId3 = generateId();
        addFeedItem({ id: textId3, type: 'text', content: '' });

        await animateText(
            "Anyway thanks for your interest. If you want to connect, check Adam out at LinkedIn.",
            (text: string) => updateFeedItem(textId3, { content: text })
        );

        addFeedItem({
            id: generateId(),
            type: 'link',
            text: 'Connect on',
            url: 'https://www.linkedin.com/in/adam-yuras-ux/',
            palette: paletteMain
        });
    };

    // Handler for the initial button
    const createResponse = async () => {
        // Add a streaming text feed item
        let textId = generateId();
        addFeedItem({ id: textId, type: 'text', content: '' });
        
        await animateText(
            "Hello there! I'm Adamatic. Your friendly Adam-oriented AI.",
            (text: string) => updateFeedItem(textId, { content: text })
        );

        textId = generateId();
        addFeedItem({ id: textId, type: 'text', content: '' });

        // Generate text and stream updates
        const responseID = await generateText({
            setText: (text: string) => updateFeedItem(textId, { content: text }),
            scrollRef,
            onDone: () => updateFeedItem(textId, { isLoading: false }),
            onAfter: () => {
                // Add the form after text is done
                const formId = generateId();
                addFeedItem({
                    id: formId,
                    type: 'form',
                    prompt: '',
                    placeholder: 'Enter an object, a phrase, whatever',
                    buttonText: 'Create',
                    onSubmit: (e) => createColor(e, formId)
                });
            }
        });

        const textId2 = generateId();
        addFeedItem({ id: textId2, type: 'text', content: '' });

        await animateText(
            "Let's have some fun. Think of something, anything, and I'll make a color palette from it.",
            (text: string) => updateFeedItem(textId2, { content: text })
        );

        lastResponseID.current = responseID;
    };

    return (
        <div className='feed-wrapper'>
            {feedItems.length > 0 ? feedItems.map((item) => {
                switch (item.type) {
                    case 'text':
                        return (
                            <TextItem props={item} />
                        );
                    case 'button':
                        return (
                            <ButtonItem props={item} />
                        );
                    case 'form':
                        return (
                            <FormItem props={item} />
                        );
                    case 'generating':
                        return (
                            <GeneratingItem props={item} />
                        );
                    case 'palette':
                        return (
                            <PaletteItem props={item} />
                        );
                    case 'link':
                        return (
                            <div key={item.id} className='link'>{item.text} <a style={{ backgroundColor: getTextColor(item.palette), color: item.palette }} href={item.url}>LinkedIn</a></div>
                        );
                    default:
                        return null;
                }
            }) :
                <div className='button-wrapper'>
                    <button className="main-button pulse" onClick={createResponse}>What else?
                        <div className='pulse' />
                    </button>
                </div>
            }
            <div ref={scrollRef} />
        </div>
    );
};
