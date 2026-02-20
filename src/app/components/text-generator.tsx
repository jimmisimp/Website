import { useRef, useEffect, useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useFeedItems, useColorUtils, useOpenAI } from '@/lib/hooks';
import type { ColorPalette, FeedItem } from '@/lib/types';
import { GeneratingItem, FormItem, TextItem, PaletteItem, ButtonItem, ButtonGroupItem } from '@/lib/components';

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const animateText = async (text: string, setText: (value: string) => void, delay = 32) => {
    if (!text) {
        return;
    }

    const chunkSize = text.length > 220 ? 10 : text.length > 140 ? 8 : text.length > 80 ? 6 : 4;
    for (let i = chunkSize; i <= text.length; i += chunkSize) {
        setText(text.slice(0, i));
        await wait(delay);
    }

    setText(text);
};

export const TextGenerator = () => {
    const { getTextColor, getDarkestColor, getAccessibleDarkColor } = useColorUtils();
    const { feedItems, addFeedItem, updateFeedItem, removeFeedItem, generateId } = useFeedItems();
    const { generateColorPalette, generateText } = useOpenAI();
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        document.documentElement.classList.add('transitions-enabled');
        return () => {
            if (scrollTimeoutRef.current !== null) {
                window.clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    const scroll = useCallback((delay = 100) => {
        if (scrollTimeoutRef.current !== null) {
            window.clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = window.setTimeout(() => {
            scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
            scrollTimeoutRef.current = null;
        }, delay);
    }, []);

    const setBackgroundColor = useCallback((palette: ColorPalette) => {
        document.documentElement.style.backgroundColor = getAccessibleDarkColor(
            getDarkestColor(palette.colors.map(c => c.hex))
        );
    }, [getAccessibleDarkColor, getDarkestColor]);

    const addTextItem = useCallback(async (text: string, speed?: number) => {
        const id = generateId();
        addFeedItem({ id, type: 'text', content: '' });
        scroll(50);
        const delay = speed ?? (text.length > 100 ? 20 : text.length > 60 ? 24 : 28);
        await animateText(text, (content) => updateFeedItem(id, { type: 'text', content }), delay);
        return id;
    }, [addFeedItem, generateId, scroll, updateFeedItem]);

    const renderFeedItem = useCallback((item: FeedItem) => {
        switch (item.type) {
            case 'text':
                return <TextItem key={item.id} props={item} />;
            case 'button':
                return <ButtonItem key={item.id} props={item} />;
            case 'button-group':
                return <ButtonGroupItem key={item.id} props={item} />;
            case 'form':
                return <FormItem key={item.id} props={item} />;
            case 'generating':
                return <GeneratingItem key={item.id} props={item} />;
            case 'palette':
                return <PaletteItem key={item.id} props={item} />;
            case 'link':
                return (
                    <div key={item.id} className='link'>
                        {item.text}{' '}
                        <a
                            style={{ backgroundColor: getTextColor(item.palette), color: item.palette }}
                            href={item.url}
                            target='_blank'
                            rel='noreferrer'
                        >
                            LinkedIn
                        </a>
                    </div>
                );
            default:
                return null;
        }
    }, [getTextColor]);

    const createColor = useCallback(async (event: FormEvent<HTMLFormElement>, formId: string) => {
        event.preventDefault();
        const inputValue = event.currentTarget.querySelector<HTMLInputElement>('input[name="colorInput"]')?.value.trim();
        if (!inputValue) return;

        removeFeedItem(formId);
        event.currentTarget.reset();

        const genId = generateId();
        addFeedItem({ id: genId, type: 'generating', message: '' });
        scroll(50);
        await animateText(`Generating a palette from "${inputValue}"...`, (msg) => updateFeedItem(genId, { message: msg }), 20);

        const palette = await generateColorPalette({
            input: inputValue,
            onPalette: (p: ColorPalette) => {
                updateFeedItem(genId, { type: 'palette', data: p });
                setBackgroundColor(p);
                scroll(150);
            },
            scrollRef,
        });

        await wait(700);
        const textId = generateId();
        addFeedItem({ id: textId, type: 'generating', message: 'Judging my handiwork...' });
        scroll(50);

        let hasScrolled = false;
        await generateText({
            setText: (text) => {
                updateFeedItem(textId, { type: 'text', content: text, isLoading: true });
                if (!hasScrolled && text.length > 20) {
                    scroll();
                    hasScrolled = true;
                }
            },
            scrollRef,
            onDone: () => updateFeedItem(textId, { isLoading: false }),
            instructions: `You have just generated a new color palette using the user's input as inspiration. Give a sentence about how nice the palette is. The palette is: ${JSON.stringify(palette)}`,
        });

        await wait(1800);
        await addTextItem('I hope you\'ve been dazzled. If you want to connect with the real Adam or check out his work history, choose an option below.');
        await wait(600);

        addFeedItem({
            id: generateId(),
            type: 'button-group',
            buttons: [
                { text: 'LinkedIn', onClick: () => window.open('https://www.linkedin.com/in/adam-yuras-ai/', '_blank') },
                { text: 'Resume', onClick: () => window.open('/resume', '_blank') },
            ],
        });
        scroll();
    }, [addFeedItem, generateColorPalette, generateId, generateText, removeFeedItem, scroll, setBackgroundColor, updateFeedItem]);

    const createResponse = useCallback(async () => {
        const genId = generateId();

        const intro = addTextItem("Hello there! I'm Adamatic. Your friendly Adam-oriented AI.");

        let buffer = '';
        let isVisible = false;
        let hasScrolled = false;
        let hasCompleted = false;
        const aiText = generateText({
            setText: (text) => {
                buffer = text;
                if (isVisible) {
                    updateFeedItem(genId, { type: 'text', content: text, isLoading: !hasCompleted });
                    if (!hasScrolled && text.length > 30) {
                        scroll();
                        hasScrolled = true;
                    }
                }
            },
            scrollRef,
            onDone: () => {
                hasCompleted = true;
                if (isVisible) {
                    updateFeedItem(genId, { isLoading: false });
                }
            },
        });

        await intro;
        await wait(800);
        await addTextItem("Thanks for your interest in Adam. I'll try to be a good AI representative in his stead. But just so we're clear, any opinions are my own (to whatever extent an AI can have opinions). ");
        await wait(900);

        addFeedItem({ id: genId, type: 'generating', message: 'Describing Adam...' });
        scroll(50);
        isVisible = true;
        if (buffer) {
            updateFeedItem(genId, { type: 'text', content: buffer, isLoading: !hasCompleted });
        }

        await aiText;
        updateFeedItem(genId, { isLoading: false });
        await wait(800);
        await addTextItem("You came here for some AI Magic™, so let's spruce the place up a bit. I'm going to make a brand new, never-before-seen color palette just for you. Give me a subject to work with.");
        await wait(700);

        const formId = generateId();
        addFeedItem({ id: formId, type: 'form', prompt: '', placeholder: 'Enter an object, a phrase, whatever', buttonText: 'Create', onSubmit: (e) => createColor(e, formId) });
        scroll();
    }, [addFeedItem, addTextItem, createColor, generateId, generateText, scroll, updateFeedItem]);

    const renderedFeedItems = useMemo(() => feedItems.map(renderFeedItem), [feedItems, renderFeedItem]);

    return (
        <div className='feed-wrapper'>
            {feedItems.length
                ? renderedFeedItems
                : (
                    <div className='button-wrapper'>
                        <button className="main-button pulse" onClick={createResponse}>
                            What else?
                            <div className='pulse' />
                        </button>
                    </div>
                )}
            <div ref={scrollRef} />
        </div>
    );
};
