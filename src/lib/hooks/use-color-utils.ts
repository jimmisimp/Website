import { useCallback } from 'react';

export const useColorUtils = () => {
    const getLuminance = useCallback((hexColor: string): number => {
        const rgb = parseInt(hexColor.slice(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;

        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return luma;
    }, []);

    const getTextColor = useCallback((backgroundColor: string): string => {
        const luma = getLuminance(backgroundColor);
        return luma < 140 ? '#ffffff' : '#171717';
    }, [getLuminance]);

    const isValidHexColor = useCallback((hex: string): boolean => {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
    }, []);

    const hexToRgb = useCallback((hex: string): { r: number; g: number; b: number } | null => {
        if (!isValidHexColor(hex)) return null;
        
        const rgb = parseInt(hex.slice(1), 16);
        return {
            r: (rgb >> 16) & 0xff,
            g: (rgb >> 8) & 0xff,
            b: (rgb >> 0) & 0xff
        };
    }, [isValidHexColor]);

    const rgbToHex = useCallback((r: number, g: number, b: number): string => {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }, []);

    return {
        getLuminance,
        getTextColor,
        isValidHexColor,
        hexToRgb,
        rgbToHex
    };
}; 