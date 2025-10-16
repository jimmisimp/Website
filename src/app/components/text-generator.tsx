import { useRef } from 'react';
import type { FormEvent } from 'react';
import { useFeedItems, useColorUtils, useOpenAI } from '@/lib/hooks';
import type { ColorPalette, FeedItem } from '@/lib/types';
import { GeneratingItem, FormItem, TextItem, PaletteItem, ButtonItem } from '@/lib/components';

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const animateText = async (
    text: string,
    setText: (value: string) => void,
    delay = 48
) => {
    if (!text) return;
    for (let i = 1; i <= text.length; i += 1) {
        setText(text.slice(0, i));
        await wait(delay);
    }
    setText(text);
};

export const TextGenerator = () => {
    const { getTextColor } = useColorUtils();
    const { feedItems, addFeedItem, updateFeedItem, removeFeedItem, generateId } = useFeedItems();
    const { generateColorPalette, generateText } = useOpenAI();
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastResponseID = useRef<string | null>(null);

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
        form.reset();

        const generatingId = generateId();
        addFeedItem({ id: generatingId, type: 'generating', message: '' });

        await animateText(
            'Generating a color palette...',
            (text: string) => updateFeedItem(generatingId, { message: text }),
            24
        );

        let palettePrimary = '';
        const responseID = await generateColorPalette({
            input: inputValue,
            onPalette: (palette: ColorPalette) => {
                removeFeedItem(generatingId);
                addFeedItem({ id: generateId(), type: 'palette', data: palette });
                palettePrimary = palette.colors[0].hex;
            },
            scrollRef,
            lastResponseID: lastResponseID.current || undefined,
        });
        if (responseID) {
            lastResponseID.current = responseID;
        }

        const textId = generateId();
        addFeedItem({ id: textId, type: 'text', content: '' });

        const paletteSentence = await generateText({
            setText: (text: string) => updateFeedItem(textId, { content: text }),
            scrollRef,
            onDone: () => updateFeedItem(textId, { isLoading: false }),
            onAfter: () => {
                if (responseID) lastResponseID.current = responseID;
            },
            instructions:
                "Give a sentence about how nice the palette is. Be witty and sarcastic while bragging about how good the palette is. Don't be too cutesy or inappropriate.",
            lastResponseID: lastResponseID.current || undefined,
        });
        lastResponseID.current = paletteSentence;

        const outroId = generateId();
        addFeedItem({ id: outroId, type: 'text', content: '' });

        await animateText(
            "How fun... Actually, I made a game too. Try it out. The AI isn't me, and it's not very Adam-centric. But it's fun.",
            (text: string) => updateFeedItem(outroId, { content: text }),
            32
        );

        addFeedItem({
            id: generateId(),
            type: 'button',
            text: 'Play MindMeld',
            onClick: () => window.open('https://adamyuras.com/mindmeld', '_blank'),
        });

        const signOffId = generateId();
        addFeedItem({ id: signOffId, type: 'text', content: '' });

        await animateText(
            'Anyway thanks for your interest. If you want to connect, check Adam out at LinkedIn.',
            (text: string) => updateFeedItem(signOffId, { content: text }),
            32
        );

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

        const responseId = generateId();
        addFeedItem({ id: responseId, type: 'text', content: '' });

        const generatedId = await generateText({
            setText: (text: string) => updateFeedItem(responseId, { content: text }),
            scrollRef,
            onDone: () => updateFeedItem(responseId, { isLoading: false }),
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
            "Let's have some fun. Think of something, anything, and I'll make a color palette from it.",
            (text: string) => updateFeedItem(promptId, { content: text }),
            28
        );

        lastResponseID.current = generatedId;
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
