import React from 'react';
import { ChatAvatar } from '@/lib/components';
import { TextFeedItem } from '@/lib/types';

export const TextItem = ({ props }: { props: TextFeedItem }) => {
	return (
		<React.Fragment key={props.id}>
			<ChatAvatar />
			<div className='content-block'>
				<div className={`generated-text${props.isLoading ? ' loading' : ''}`}>{props.content}</div>
			</div>
		</React.Fragment>
	)
}