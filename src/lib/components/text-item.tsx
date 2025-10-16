import { ChatAvatar } from '@/lib/components';
import { TextFeedItem } from '@/lib/types';

export const TextItem = ({ props }: { props: TextFeedItem }) => {
	return (
		<>
			<ChatAvatar />
			<div className='content-block'>
				<div className={`generated-text${props.isLoading ? ' loading' : ''}`}>{props.content}</div>
			</div>
		</>
	);
};
