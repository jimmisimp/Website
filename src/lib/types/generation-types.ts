import { z } from "zod";

export type ColorPalette = z.infer<typeof ColorPaletteSchema>;
export const ColorPaletteSchema = z.object({
    colors: z.array(z.object({
        hex: z.string().describe('A hex color value. Example: "#000000"'),
        name: z.string().describe('A name for the color. Example: "Dead pixel"')
    })),
    name: z.string().describe('A name for the palette. Example: "LCD Screen"'),
    caption: z.string().describe('A short caption for the palette. Example: "Inspired by the colors of an LCD screen after a hard day\'s work."'),
});

export interface GenerateTextProps {
    setText: (text: string) => void;
    scrollRef?: React.RefObject<HTMLDivElement>;
    onDone?: () => void;
    onAfter?: () => void;
    instructions?: string;
    lastResponseID?: string;
}

export interface GenerateColorProps {
    input: string;
    onPalette: (palette: ColorPalette) => void;
    scrollRef?: React.RefObject<HTMLDivElement>;
    lastResponseID?: string;
}