import { useCallback, useRef } from 'react';
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { GenerateTextProps, GenerateColorProps, ColorPalette, ColorPaletteSchema } from '@/lib/types';

const openai = new OpenAI({ 
    apiKey: process.env.REACT_APP_OPENAIKEY, 
    dangerouslyAllowBrowser: true 
});

export const useOpenAI = () => {
    const lastResponseID = useRef<string | null>(null);

    const generateText = useCallback(async ({ 
        setText, 
        scrollRef, 
        onDone, 
        onAfter, 
        instructions = '', 
        lastResponseID: providedResponseID 
    }: GenerateTextProps): Promise<string> => {
        let thisResponseID = '';
        const stream = await openai.responses.create({
            model: "gpt-5-mini",
            instructions: instructions === '' ? 
                "Write a sentence. Keep it under 48 words, and try to avoid too many adjectives. Give it a slightly sardonic humor but don't be too cutesy or include any jokes. Your response must be about the subject, Adam Yuras, a Product Manager, Designer, and Developer from Philadelphia PA. He works at Comcast. It should describe a bit about who he is and what he does. More about him from his profile: Designing, prototyping, and testing tools for customer-facing agents in the chat and voice space, for technicians, and retail associates with a focus on AI-enabled features. I'm a hands-on designer who prefers to explore solutions by developing prototypes in code. I'm a designer who thinks like a developer. I've helped develop the skills of those I work with. I'm a strong researcher, but I'm also business minded and know how to keep things moving and when we're wasting our time." : 
                instructions,
            stream: true,
            input: instructions === '' ? "Tell me about Adam Yuras." : "",
            previous_response_id: providedResponseID || lastResponseID.current
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
            }, 3000);
        });

        if (onDone) onDone();
        setTimeout(() => { 
            scrollRef?.current?.scrollIntoView({ behavior: 'smooth' }); 
        }, 100);
        if (onAfter) setTimeout(onAfter, 3000);
        
        lastResponseID.current = thisResponseID;
        return thisResponseID;
    }, []);

    const generateColorPalette = useCallback(async ({ 
        input, 
        onPalette, 
        scrollRef, 
        lastResponseID: providedResponseID 
    }: GenerateColorProps): Promise<string | undefined> => {
        try {
            const completion = await openai.responses.create({
                model: "gpt-5-mini",
                instructions: "Generate a cohesive color palette from five hex color values using the user's input as inspiration. Output only five hex values, named, a descriptive name for the whole palette, and a short one sentence caption for the palette. This should be funny and somewhat sarcastic. Output in JSON.",
                input: input,
                previous_response_id: providedResponseID || lastResponseID.current,
                text: {
                    format: zodTextFormat(ColorPaletteSchema, 'palette')
                }
            });

            const response = completion.output_text || '';
            const parsedResponse: ColorPalette = JSON.parse(response);
            if (onPalette) onPalette(parsedResponse);
            setTimeout(() => { 
                scrollRef?.current?.scrollIntoView({ behavior: 'smooth' }); 
            }, 100);
            
            lastResponseID.current = completion.id;
            return completion.id;
        } catch (error) {
            console.error('Error generating colors:', error);
            return undefined;
        }
    }, []);

    return {
        generateText,
        generateColorPalette,
        lastResponseID: lastResponseID.current,
        ColorPaletteSchema
    };
}; 