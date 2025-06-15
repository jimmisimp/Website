import { ColorPalette } from "@/lib/types";

// Define Feed Item Types
export interface FeedItemBase {	
    id: string;
}

export interface TextFeedItem extends FeedItemBase {
    type: 'text';
    content: string;
    isLoading?: boolean;
    isUser?: boolean;
}

export interface ButtonFeedItem extends FeedItemBase {
    type: 'button';
    text: string;
    onClick: () => void;
}

export interface FormFeedItem extends FeedItemBase {
    type: 'form';
    prompt: string;
    placeholder: string;
    buttonText: string;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export interface GeneratingFeedItem extends FeedItemBase {
    type: 'generating';
    message: string;
}

export interface PaletteFeedItem extends FeedItemBase {
    type: 'palette';
    data: ColorPalette;
}

export interface LinkFeedItem extends FeedItemBase {
    type: 'link';
    text: string;
    url: string;
    palette: string;
}

export type FeedItem = TextFeedItem | ButtonFeedItem | FormFeedItem | GeneratingFeedItem | PaletteFeedItem | LinkFeedItem;