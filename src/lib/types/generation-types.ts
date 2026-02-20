import { z } from "zod";

export type ColorPalette = z.infer<typeof ColorPaletteSchema>;
export const ColorPaletteSchema = z.object({
    colors: z.array(z.object({
        hex: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color value').describe('A hex color value. Example: "#000000"'),
        name: z.string().describe('A name for the color. Example: "Dead pixel"')
    })).min(1),
    name: z.string().describe('A name for the palette. Example: "LCD Screen"'),
    caption: z.string().describe('A short caption for the palette. Example: "Inspired by the colors of an LCD screen after a hard day\'s work."'),
});

export type RSVPData = z.infer<typeof RSVPDataSchema>;
export const RSVPDataSchema = z.object({
    names: z.array(z.string()).describe('Array of first names of attendees. Example: ["Shannon", "Adam"]'),
    contact: z.string().optional().nullable().describe('Email address or phone number. Example: "email@example.com" or "555-1234"'),
    contactType: z.enum(['email', 'phone']).optional().nullable().describe('Whether the contact is an email or phone number'),
    guestCount: z.number().describe('Total number of guests attending. Example: 2'),
    details: z.string().optional().nullable().describe('Important details like dietary restrictions, accessibility needs, or special requests. Leave empty if none specified. Example: "Vegetarian meal needed" or "Wheelchair accessible seating"'),
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

export interface ParseRSVPProps {
    input: string;
    onParsed: (data: RSVPData) => void;
}
