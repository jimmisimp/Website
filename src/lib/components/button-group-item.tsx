import { ButtonGroupFeedItem } from '@/lib/types';

export const ButtonGroupItem = ({ props }: { props: ButtonGroupFeedItem }) => {
    return (
        <div className='button-wrapper'>
            {props.buttons.map((button, index) => (
                <button
                    key={`${button.text}-${index}`}
                    className="main-button"
                    onClick={button.onClick}
                >
                    {button.text}
                    <div className='pulse' />
                </button>
            ))}
        </div>
    );
};
