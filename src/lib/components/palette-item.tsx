import { ChatAvatar } from '@/lib/components';
import { PaletteFeedItem } from '@/lib/types';
import { useColorUtils } from '@/lib/hooks';

export const PaletteItem = ({ props }: { props: PaletteFeedItem }) => {
    const { getTextColor, isValidHexColor } = useColorUtils();
    const safeColors = Array.isArray(props.data.colors) ? props.data.colors : [];

    return (
        <>
            <ChatAvatar />
            <div className='content-block'>
                <div className='generated-text'>I call this "{props.data.name}"</div>
                <div className='color-results'>
                    {safeColors.length
                        ? safeColors.map((color: { hex: string; name: string }, index: number) => {
                            const hexCandidate = typeof color?.hex === 'string' ? color.hex : '';
                            const swatchHex = isValidHexColor(hexCandidate) ? hexCandidate : '#000000';
                            const swatchName = color?.name || `Color ${index + 1}`;
                            return (
                                <div key={index} style={{ backgroundColor: swatchHex, padding: '12px', color: getTextColor(swatchHex) }}>
                                    {swatchName} ({swatchHex})
                                </div>
                            );
                        })
                        : (
                            <div style={{ backgroundColor: '#000000', padding: '12px', color: '#ffffff' }}>
                                No palette colors available
                            </div>
                        )}
                </div>
                <div className='generated-text'>{props.data.caption}</div>
            </div>
        </>
    );
};
