import { ChatAvatar } from '@/lib/components';
import { FormFeedItem } from '@/lib/types';

export const FormItem = ({ props }: { props: FormFeedItem }) => {
    return (
        <>
            <ChatAvatar />
            <form onSubmit={props.onSubmit} className='content-block'>
                <fieldset className='input-group' disabled={props.disabled}>
                    <input
                        maxLength={64}
                        name='colorInput'
                        placeholder={props.placeholder}
                        className='color-input'
                        autoComplete='off'
                        disabled={props.disabled}
                    />
                    <button type="submit" className="main-button" disabled={props.disabled}>
                        {props.buttonText}
                    </button>
                </fieldset>
            </form>
        </>
    );
};
