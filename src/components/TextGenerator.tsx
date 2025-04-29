import React, { useState, useRef } from 'react';
import OpenAI from "openai";
import { ChatAvatar } from "./ChatAvatar.tsx"
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const openai = new OpenAI({ apiKey: process.env.REACT_APP_OPENAIKEY, dangerouslyAllowBrowser: true });

type ColorPalette = z.infer<typeof ColorPaletteSchema>;
const ColorPaletteSchema = z.object({
    colors: z.array(z.object({
        hex: z.string().describe('A hex color value. Example: "#000000"'),
        name: z.string().describe('A name for the color. Example: "Dead pixel"')
    })),
    name: z.string().describe('A name for the palette. Example: "LCD Screen"'),
    caption: z.string().describe('A short caption for the palette. Example: "Inspired by the colors of an LCD screen after a hard day\'s work."'),
});

function getLuminance(hexColor) {
    const rgb = parseInt(hexColor.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma;
}

function getTextColor(backgroundColor) {
    const luma = getLuminance(backgroundColor);
    return luma < 140 ? '#ffffff' : '#171717';
}

async function fakeGenerateText(text, setText, scrollRef, updateFeedItem) {
    const textId = generateId();
    updateFeedItem(textId, { content: '' });

    let maxDelay = 0;
    const chunkSize = 5;
    for (let i = 0; i < text.length + chunkSize; i += chunkSize) {
        const delay = i * 5;
        maxDelay = Math.max(maxDelay, delay);
        setTimeout(() => {
            if (text.length - i >= 0) {
                setText(text.substring(0, i))
                updateFeedItem(textId, { content: text.substring(0, i) });
            } else {
                setText(text);
                updateFeedItem(textId, { content: text });
            }
        }, delay)
    }
    setTimeout(() => { scrollRef.current.scrollIntoView({ behavior: 'smooth' }) }, 100)

    // Wait for all timeouts to complete before returning
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(void 0);
        }, maxDelay + 1500); // Add a small buffer to ensure all timeouts complete
    });
}

async function generateText(setText, scrollRef, onDone, onAfter,instructions='',lastResponseID:string|undefined=undefined) {
    let thisResponseID = '';
    const stream = await openai.responses.create({
        model: "gpt-4.1-mini",
        temperature: 0.75,
        instructions: instructions === '' ? "Write a sentence. Keep it under 48 words, and try to avoid too many adjectives. Give it a slightly sardonic humor but don't be too cutesy or include any jokes. Your response must be about the subject, Adam Yuras, a Product Manager, Designer, and Developer from Philadelphia PA. He works at Comcast. It should describe a bit about who he is and what he does. More about him from his profile: Designing, prototyping, and testing tools for customer-facing agents in the chat and voice space, for technicians, and retail associates with a focus on AI-enabled features. I'm a hands-on designer who prefers to explore solutions by developing prototypes in code. I'm a designer who thinks like a developer. I've helped develop the skills of those I work with. I'm a strong researcher, but I'm also business minded and know how to keep things moving and when we're wasting our time." : instructions,
        stream: true,
        input: instructions === '' ? "Tell me about Adam Yuras." : "",
        previous_response_id: lastResponseID
    });
    let textOut = '';
    for await (const chunk of stream) {
        if (chunk.type === 'response.output_text.delta') {
            textOut += chunk.delta;
            setText(textOut);
        } else if (chunk.type === 'response.created') {
            thisResponseID = chunk.response.id;
        }
    }
    await new Promise(resolve => {
        setTimeout(() => {
            resolve(void 0);
        }, 3000); // Add a small buffer to ensure all timeouts complete
    });
    if (onDone) onDone();
    setTimeout(() => { scrollRef.current.scrollIntoView({ behavior: 'smooth' }) }, 100)
    if (onAfter) setTimeout(onAfter, 3000);
    return thisResponseID;
}

async function generateColorFeed(input, onPalette, scrollRef, lastResponseID) {
    try {
        const completion = await openai.responses.create({
            model: "gpt-4.1-mini",
            instructions: "Generate a cohesive color palette from five hex color values using the user's input as inspiration. Output only five hex values, named, a descriptive name for the whole palette, and a short one sentence caption for the palette. This should be funny and somewhat sarcastic. Output in JSON.",
            input: input,
            previous_response_id: lastResponseID,
            max_output_tokens: 256,
            text: {
                format: zodTextFormat(ColorPaletteSchema, 'palette')
            }
        });
        const response = completion.output_text || '';
        const parsedResponse: ColorPalette = JSON.parse(response);
        if (onPalette) onPalette(parsedResponse);
        setTimeout(() => { scrollRef.current.scrollIntoView({ behavior: 'smooth' }) }, 100)
        return completion.id;
    } catch (error) {
        console.error('Error generating colors:', error);
    }
}

// Define Feed Item Types
interface FeedItemBase {
    id: string; // Unique ID for React keys
}

interface TextFeedItem extends FeedItemBase {
    type: 'text';
    content: string;
    isLoading?: boolean; // For streaming text
    isUser?: boolean; // Differentiate user input if needed later
}

interface ButtonFeedItem extends FeedItemBase {
    type: 'button';
    text: string;
    onClick: () => void;
}

interface FormFeedItem extends FeedItemBase {
    type: 'form';
    prompt: string;
    placeholder: string;
    buttonText: string;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

interface GeneratingFeedItem extends FeedItemBase {
    type: 'generating';
    message: string;
}

interface PaletteFeedItem extends FeedItemBase {
    type: 'palette';
    data: ColorPalette;
}

interface LinkFeedItem extends FeedItemBase {
    type: 'link';
    text: string;
    url: string;
    palette: string; // For styling
}

type FeedItem = TextFeedItem | FormFeedItem | GeneratingFeedItem | PaletteFeedItem | LinkFeedItem | ButtonFeedItem;

// Helper for unique IDs (simple counter for now)
let nextId = 0;
const generateId = () => `feed-item-${nextId++}`;

export const TextGenerator: React.FC = () => {
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const lastResponseID = useRef<string | null | undefined>(null);
    const scrollRef = useRef<HTMLInputElement>(null);

    // Helper to update a feed item by id
    const updateFeedItem = (id: string, update: Partial<FeedItem>) => {
        setFeedItems(items => items.map(item => item.id === id ? { ...item, ...update } as FeedItem : item) as FeedItem[]);
    };

    // Add a new feed item
    const addFeedItem = (item: FeedItem) => {
        setFeedItems(items => [...items, item]);
    };

    // Handler for the initial button
    const createResponse = async () => {
        // Add a streaming text feed item
        let textId = generateId();
        addFeedItem({ id: textId, type: 'text', content: '' });
        await fakeGenerateText(
            "Hello there! I'm Adamatic. Your friendly Adam-oriented AI.",
            (text: string) => updateFeedItem(textId, { content: text }),
            scrollRef,
            addFeedItem
        )

        textId = generateId();
        addFeedItem({ id: textId, type: 'text', content: '' });

        // Generate text and stream updates
        const responseID = await generateText(
            (text: string) => updateFeedItem(textId, { content: text }),
            scrollRef,
            () => updateFeedItem(textId, { isLoading: false }),
            () => {
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
        );


        const textId2 = generateId();
        addFeedItem({ id: textId2, type: 'text', content: '' });

        await fakeGenerateText(
            "Let's have some fun. Think of something, anything, and I'll make a color palette from it.",
            (text: string) => updateFeedItem(textId2, { content: text }),
            scrollRef,
            addFeedItem
        )

        lastResponseID.current = responseID;
    };

    // Handler for the color form
    const createColor = async (e, formId: string) => {
        e.preventDefault();
        const input: string = e.target.elements.colorInput.value;
        if (!input || input.length === 0) return;

        // Disable the form
        document.getElementById(formId)?.setAttribute('disabled', 'disabled');

        // Add a generating feed item
        const genId = generateId();
        addFeedItem({ id: genId, type: 'generating', message: '' });
        await fakeGenerateText(
            "Generating a color palette...",
            (text: string) => updateFeedItem(genId, { message: text }),
            scrollRef,
            addFeedItem
        )

        // Generate color palette
        let paletteMain: string = '';
        const responseID = await generateColorFeed(
            input,
            (palette: ColorPalette) => {
                // Remove the generating item
                setFeedItems(items => items.filter(item => item.id !== genId));
                // Add the palette
                const paletteId = generateId();
                addFeedItem({ id: paletteId, type: 'palette', data: palette });
                paletteMain = palette.colors[0].hex;
            },
            scrollRef,
            lastResponseID.current
        );
        lastResponseID.current = responseID;

        const textId = generateId();
        addFeedItem({ id: textId, type: 'text', content: '' });

        await generateText(
            (text: string) => updateFeedItem(textId, { content: text }),
            scrollRef,
            () => updateFeedItem(textId, { isLoading: false }),
            () => {
                lastResponseID.current = responseID;
            },
            "Give a sentence about how nice the palette is. Be witty and sarcastic while bragging about how good the palette is. Don't be too cutesy or inappropiate.",
            lastResponseID.current
        )

        const textId2 = generateId();
        addFeedItem({ id: textId2, type: 'text', content: '' });

        await fakeGenerateText(
            "How fun... Actually, I made a game too. Try it out. The AI isn't me, and it's not very Adam-centric. But it's fun.",
            (text: string) => updateFeedItem(textId2, { content: text }),
            scrollRef,
            addFeedItem
        )

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

        await fakeGenerateText(
            "Anyway thanks for your interest. If you want to connect, check Adam out at LinkedIn.",
            (text: string) => updateFeedItem(textId3, { content: text }),
            scrollRef,
            addFeedItem
        )

        addFeedItem({
            id: generateId(),
            type: 'link',
            text: 'Connect on',
            url: 'https://www.linkedin.com/in/adam-yuras-ux/',
            palette: paletteMain
        });
    };

    return (
        <div className='feed-wrapper'>
            {feedItems.length > 0 ? feedItems.map((item) => {
                switch (item.type) {
                    case 'text':
                        return (
                            <React.Fragment key={item.id}>
                                <ChatAvatar />
                                <div className='content-block'>
                                    <div className={`generated-text${item.isLoading ? ' loading' : ''}`}>{item.content}</div>
                                </div>
                            </React.Fragment>
                        );
                    case 'button':
                        return (
                            <React.Fragment key={item.id}>
                                    <div className='button-wrapper'>
                                        <button className="main-button" onClick={item.onClick}>Play MindMeld
                                            <div className='pulse' />
                                        </button>
                                    </div>
                            </React.Fragment>
                        );
                    case 'form':
                        return (
                            <React.Fragment key={item.id}>
                                <ChatAvatar />
                                <form onSubmit={item.onSubmit} className='content-block'>
                                    <fieldset id={item.id} className='input-group'>
                                        <input maxLength={64} name='colorInput' placeholder={item.placeholder} className='color-input' autoComplete='off' />
                                        <button type="submit" className="main-button">{item.buttonText}</button>
                                    </fieldset>
                                </form>
                            </React.Fragment>
                        );
                    case 'generating':
                        return (
                            <React.Fragment key={item.id}>
                                <ChatAvatar />
                                <div className='content-block'>
                                    <div className='generated-text loading-text'>{item.message}</div>
                                </div>
                            </React.Fragment>
                        );
                    case 'palette':
                        return (
                            <React.Fragment key={item.id}>
                                <ChatAvatar />
                                <div className='content-block'>
                                    <div className='generated-text'>I call this "{item.data.name}"</div>
                                    <div className='color-results'>
                                        {item.data.colors.map((color, index) => (
                                            <div key={index} style={{ backgroundColor: color.hex, padding: '12px', color: getTextColor(color.hex) }}>
                                                {color.name} ({color.hex})
                                            </div>
                                        ))}
                                    </div>
                                    <div className='generated-text'>{item.data.caption}</div>
                                </div>
                            </React.Fragment>
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
