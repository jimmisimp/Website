import { useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useFeedItems, useColorUtils, useOpenAI } from '@/lib/hooks';
import type { ColorPalette, FeedItem } from '@/lib/types';
import { GeneratingItem, FormItem, TextItem, PaletteItem, ButtonItem } from '@/lib/components';

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const animateText = async (
    text: string,
    setText: (value: string) => void,
    delay = 32
) => {
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

    useEffect(() => {
        document.documentElement.classList.add('transitions-enabled');
    }, []);

    const setBackgroundColor = (palette: ColorPalette) => {
        const hexColors = palette.colors.map(c => c.hex);
        const darkest = getDarkestColor(hexColors);
        const accessibleDark = getAccessibleDarkColor(darkest);
        document.documentElement.style.backgroundColor = accessibleDark;
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
        const form = event.currentTarget;
        const input = form.querySelector<HTMLInputElement>('input[name="colorInput"]');
        const inputValue = input?.value.trim();
        if (!inputValue) return;

        updateFeedItem(formId, { disabled: true });
        removeFeedItem(formId);
        form.reset();

        const generatingId = generateId();
        addFeedItem({ id: generatingId, type: 'generating', message: '' });

        await animateText(
            'Generating a color palette...',
            (text: string) => updateFeedItem(generatingId, { message: text }),
            24
        );

        let palettePrimary = '';
        const palette = await generateColorPalette({
            input: inputValue,
            onPalette: (palette: ColorPalette) => {
                updateFeedItem(generatingId, { type: 'palette', data: palette });
                palettePrimary = palette.colors[0].hex;
                setBackgroundColor(palette);
            },
            scrollRef,
        });

        const textId = generateId();
        addFeedItem({ id: textId, type: 'generating', message: 'Judging...' });

        await generateText({
            setText: (text: string) => updateFeedItem(textId, { type: 'text', content: text, isLoading: true }),
            scrollRef,
            onDone: () => updateFeedItem(textId, { isLoading: false }),
            instructions:
                "Give a sentence about how nice the palette is. Don't be too cutesy or inappropriate. This response should be funny and somewhat sarcastic. The palette is: " + JSON.stringify(palette),
        });

        const signOffId = generateId();
        addFeedItem({ id: signOffId, type: 'text', content: '' });

        await animateText(
            'Thanks for your interest. If you want to connect, check Adam out at LinkedIn. For some more fun, try out my AI-powered guessing game, MindMeld.',
            (text: string) => updateFeedItem(signOffId, { type: 'text', content: text }),
            32
        );

        addFeedItem({
            id: generateId(),
            type: 'button',
            text: 'Play MindMeld',
            onClick: () => window.open('https://adamyuras.com/mindmeld', '_blank'),
        });

        addFeedItem({
            id: generateId(),
            type: 'link',
            text: 'Connect on',
            url: 'https://www.linkedin.com/in/adam-yuras-ux/',
            palette: palettePrimary,
        });
    };

    const createResponse = async () => {
        const introId = generateId();
        addFeedItem({ id: introId, type: 'text', content: '' });

        await animateText(
            "Hello there! I'm Adamatic. Your friendly Adam-oriented AI.",
            (text: string) => updateFeedItem(introId, { content: text }),
            28
        );

        const generatingId = generateId();
        addFeedItem({ id: generatingId, type: 'generating', message: 'Thinking...' });

        await generateText({
            setText: (text: string) => {
                updateFeedItem(generatingId, { type: 'text', content: text, isLoading: true });
            },
            scrollRef,
            onDone: () => {
                updateFeedItem(generatingId, { isLoading: false });
            },
            onAfter: () => {
                const formId = generateId();
                addFeedItem({
                    id: formId,
                    type: 'form',
                    prompt: '',
                    placeholder: 'Enter an object, a phrase, whatever',
                    buttonText: 'Create',
                    onSubmit: (e) => createColor(e, formId),
                });
            },
        });

        const promptId = generateId();
        addFeedItem({ id: promptId, type: 'text', content: '' });

        await animateText(
            "As a gift for checking out the site, I'm going to make a color palette just for you. Give me a subject to work with.",
            (text: string) => updateFeedItem(promptId, { content: text }),
            28
        );

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
