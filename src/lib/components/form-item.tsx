import React from 'react';
import { ChatAvatar } from '@/lib/components';
import { FormFeedItem } from '@/lib/types';

export const FormItem = ({ props }: { props: FormFeedItem }) => {
    return (
        <React.Fragment key={props.id}>
            <ChatAvatar />
            <form onSubmit={props.onSubmit} className='content-block'>
                <fieldset id={props.id} className='input-group'>
                    <input maxLength={64} name='colorInput' placeholder={props.placeholder} className='color-input' autoComplete='off' />
                    <button type="submit" className="main-button">{props.buttonText}</button>
                </fieldset>
            </form>
        </React.Fragment>
    )
}