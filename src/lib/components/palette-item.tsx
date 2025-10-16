import { ChatAvatar } from '@/lib/components';
import { PaletteFeedItem } from '@/lib/types';
import { useColorUtils } from '@/lib/hooks';

export const PaletteItem = ({ props }: { props: PaletteFeedItem }) => {
    const { getTextColor } = useColorUtils();

    return (
        <>
            <ChatAvatar />
            <div className='content-block'>
                <div className='generated-text'>I call this "{props.data.name}"</div>
                <div className='color-results'>
                    {props.data.colors.map((color: { hex: string; name: string }, index: number) => (
                        <div key={index} style={{ backgroundColor: color.hex, padding: '12px', color: getTextColor(color.hex) }}>
                            {color.name} ({color.hex})
                        </div>
                    ))}
                </div>
                <div className='generated-text'>{props.data.caption}</div>
            </div>
        </>
    );
};
