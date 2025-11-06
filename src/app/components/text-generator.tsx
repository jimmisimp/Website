import { useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useFeedItems, useColorUtils, useOpenAI } from '@/lib/hooks';
import type { ColorPalette, FeedItem } from '@/lib/types';
import { GeneratingItem, FormItem, TextItem, PaletteItem, ButtonItem } from '@/lib/components';

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const animateText = async (text: string, setText: (value: string) => void, delay = 32) => {
    if (!text) return;
    for (let i = 4; i <= text.length; i += 4) {
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

    useEffect(() => document.documentElement.classList.add('transitions-enabled'), []);

    const scroll = (delay = 100) => {
        setTimeout(() => scrollRef?.current?.scrollIntoView({ behavior: 'smooth' }), delay);
    };

    const setBackgroundColor = (palette: ColorPalette) => {
        document.documentElement.style.backgroundColor = getAccessibleDarkColor(
            getDarkestColor(palette.colors.map(c => c.hex))
        );
    };

    const addTextItem = async (text: string, speed?: number) => {
        const id = generateId();
        addFeedItem({ id, type: 'text', content: '' });
        scroll(50);
        const delay = speed ?? (text.length > 100 ? 20 : text.length > 60 ? 24 : 28);
        await animateText(text, (content) => updateFeedItem(id, { type: 'text', content }), delay);
        return id;
    };

    const renderFeedItem = (item: FeedItem) => {
        switch (item.type) {
            case 'text':
                return <TextItem key={item.id} props={item} />;
            case 'button':
                return <ButtonItem key={item.id} props={item} />;
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
    };

    const createColor = async (event: FormEvent<HTMLFormElement>, formId: string) => {
        event.preventDefault();
        const inputValue = event.currentTarget.querySelector<HTMLInputElement>('input[name="colorInput"]')?.value.trim();
        if (!inputValue) return;

        removeFeedItem(formId);
        event.currentTarget.reset();

        const genId = generateId();
        addFeedItem({ id: genId, type: 'generating', message: '' });
        scroll(50);
        await animateText(`Generating a palette from "${inputValue}"...`, (msg) => updateFeedItem(genId, { message: msg }), 20);

        let palettePrimary = '';
        const palette = await generateColorPalette({
            input: inputValue,
            onPalette: (p: ColorPalette) => {
                updateFeedItem(genId, { type: 'palette', data: p });
                palettePrimary = p.colors[0].hex;
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
        await addTextItem('I hope you\'ve been dazzled. If you want to connect with the real Adam, check out his LinkedIn. For some more fun, try out my AI-powered guessing game, MindMeld. It');
        await wait(600);

        addFeedItem({ id: generateId(), type: 'button', text: 'Play MindMeld', onClick: () => window.open('https://adamyuras.com/mindmeld', '_blank') });
        scroll(50);
        await wait(300);
        addFeedItem({ id: generateId(), type: 'link', text: 'Connect on', url: 'https://www.linkedin.com/in/adam-yuras-ux/', palette: palettePrimary, label: 'LinkedIn' });
        scroll();
    };

    const createResponse = async () => {
        const genId = generateId();
        
        const intro = addTextItem("Hello there! I'm Adamatic. Your friendly Adam-oriented AI.");
        
        let buffer = '', isVisible = false, hasScrolled = false;
        const aiText = generateText({
            setText: (text) => {
                buffer = text;
                if (isVisible) {
                    updateFeedItem(genId, { type: 'text', content: text, isLoading: true });
                    if (!hasScrolled && text.length > 30) {
                        scroll();
                        hasScrolled = true;
                    }
                }
            },
            scrollRef,
            onDone: () => updateFeedItem(genId, { isLoading: false }),
        });

        await intro;
        await wait(800);
        await addTextItem("Thanks for your interest in Adam. I'll try to be a good AI representative in his stead. But just so we're clear, any opinions are my own (to whatever extent an AI can have opinions). ");
        await wait(900);
        
        addFeedItem({ id: genId, type: 'generating', message: 'Describing Adam...' });
        scroll(50);
        isVisible = true;
        if (buffer) updateFeedItem(genId, { type: 'text', content: buffer, isLoading: true });
        
        await aiText;
        await wait(800);
        await addTextItem("You came here for some AI Magic™, so let's spruce the place up a bit. I'm going to make a brand new, never-before-seen color palette just for you. Give me a subject to work with.");
        await wait(700);

        const formId = generateId();
        addFeedItem({ id: formId, type: 'form', prompt: '', placeholder: 'Enter an object, a phrase, whatever', buttonText: 'Create', onSubmit: (e) => createColor(e, formId) });
        scroll();
    };

    return (
        <div className='feed-wrapper'>
            {feedItems.length
                ? feedItems.map(renderFeedItem)
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
