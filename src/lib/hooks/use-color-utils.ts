import { useCallback } from 'react';

export const useColorUtils = () => {
    const FALLBACK_HEX = '#000000';

    const normalizeHexColor = useCallback((hexColor?: string | null): string => {
        if (typeof hexColor !== 'string') {
            return FALLBACK_HEX;
        }

        const value = hexColor.trim();
        if (!value) {
            return FALLBACK_HEX;
        }

        const prefixed = value.startsWith('#') ? value : `#${value}`;

        if (/^#([A-Fa-f0-9]{6})$/.test(prefixed)) {
            return prefixed;
        }

        if (/^#([A-Fa-f0-9]{3})$/.test(prefixed)) {
            const shorthand = prefixed.slice(1);
            return `#${shorthand[0]}${shorthand[0]}${shorthand[1]}${shorthand[1]}${shorthand[2]}${shorthand[2]}`;
        }

        return FALLBACK_HEX;
    }, []);

    const getLuminance = useCallback((hexColor: string): number => {
        const normalizedColor = normalizeHexColor(hexColor);
        const rgb = parseInt(normalizedColor.slice(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;

        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return luma;
    }, [normalizeHexColor]);

    const getTextColor = useCallback((backgroundColor: string): string => {
        const luma = getLuminance(backgroundColor);
        return luma < 140 ? '#ffffff' : '#171717';
    }, [getLuminance]);

    const isValidHexColor = useCallback((hex: string): boolean => {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
    }, []);

    const hexToRgb = useCallback((hex: string): { r: number; g: number; b: number } | null => {
        const normalizedHex = normalizeHexColor(hex);
        if (!isValidHexColor(normalizedHex)) return null;
        
        const rgb = parseInt(normalizedHex.slice(1), 16);
        return {
            r: (rgb >> 16) & 0xff,
            g: (rgb >> 8) & 0xff,
            b: (rgb >> 0) & 0xff
        };
    }, [isValidHexColor, normalizeHexColor]);

    const rgbToHex = useCallback((r: number, g: number, b: number): string => {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }, []);

    const getContrastRatio = useCallback((hex1: string, hex2: string): number => {
        const lum1 = getLuminance(hex1);
        const lum2 = getLuminance(hex2);
        const lighter = Math.max(lum1, lum2);
        const darker = Math.min(lum1, lum2);
        return (lighter + 0.05) / (darker + 0.05);
    }, [getLuminance]);

    const darkenColor = useCallback((hex: string, amount: number = 0.2): string => {
        const rgb = hexToRgb(hex);
        if (!rgb) return hex;
        
        const r = Math.max(0, Math.floor(rgb.r * (1 - amount)));
        const g = Math.max(0, Math.floor(rgb.g * (1 - amount)));
        const b = Math.max(0, Math.floor(rgb.b * (1 - amount)));
        
        return rgbToHex(r, g, b);
    }, [hexToRgb, rgbToHex]);

    const getDarkestColor = useCallback((colors: string[]): string => {
        const validColors = colors
            .map(color => normalizeHexColor(color))
            .filter(isValidHexColor);

        if (!validColors.length) {
            return FALLBACK_HEX;
        }

        return validColors.reduce((darkest, color) => {
            return getLuminance(color) < getLuminance(darkest) ? color : darkest;
        });
    }, [getLuminance, isValidHexColor, normalizeHexColor]);

    const getAccessibleDarkColor = useCallback((hex: string, targetColor: string = '#ffffff'): string => {
        let darkColor = hex;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (getContrastRatio(darkColor, targetColor) < 4.5 && attempts < maxAttempts) {
            darkColor = darkenColor(darkColor, 0.15);
            attempts++;
        }
        
        return darkColor;
    }, [getContrastRatio, darkenColor]);

    return {
        getLuminance,
        getTextColor,
        isValidHexColor,
        hexToRgb,
        rgbToHex,
        getContrastRatio,
        darkenColor,
        getDarkestColor,
        getAccessibleDarkColor
    };
}; 
