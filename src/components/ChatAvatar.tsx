import React from 'react';

export const ChatAvatar: React.FC = () => {
    return (
        <div className='avatar-container'>
            <img src='avatar.svg' className='avatar'/>
            <div className='avatar-label'>adamatic</div>
        </div>
    )
}