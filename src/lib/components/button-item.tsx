import React from 'react';
import { ButtonFeedItem } from '@/lib/types';

export const ButtonItem = ({ props }: { props: ButtonFeedItem }) => {
    return (
        <React.Fragment key={props.id}>
            <div className='button-wrapper'>
                <button className="main-button" onClick={props.onClick}>{props.text}
                    <div className='pulse' />
                </button>
            </div>
        </React.Fragment>
    )
}