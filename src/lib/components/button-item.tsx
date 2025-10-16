import { ButtonFeedItem } from '@/lib/types';

export const ButtonItem = ({ props }: { props: ButtonFeedItem }) => {
    return (
        <>
            <div className='button-wrapper'>
                <button className="main-button" onClick={props.onClick}>{props.text}
                    <div className='pulse' />
                </button>
            </div>
        </>
    );
};
