import React from 'react';
import { ChatAvatar } from '@/lib/components';
import { GeneratingFeedItem } from '@/lib/types';

export const GeneratingItem = ({ props }: { props: GeneratingFeedItem }) => {
    return (
        <React.Fragment key={props.id}>
            <ChatAvatar />
            <div className='content-block'>
                <div className='generated-text loading-text'>{props.message}</div>
            </div>
        </React.Fragment>
    )
}