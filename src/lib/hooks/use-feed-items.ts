import { useState, useCallback } from 'react';
import { FeedItem } from '@/lib/types';

let nextId = 0;
const generateId = () => `feed-item-${nextId++}`;

export const useFeedItems = () => {
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

    const updateFeedItem = useCallback((id: string, update: Partial<FeedItem>) => {
        setFeedItems(items => 
            items.map(item => 
                item.id === id ? { ...item, ...update } as FeedItem : item
            ) as FeedItem[]
        );
    }, []);

    const addFeedItem = useCallback((item: FeedItem) => {
        setFeedItems(items => [...items, item]);
    }, []);

    const removeFeedItem = useCallback((id: string) => {
        setFeedItems(items => items.filter(item => item.id !== id));
    }, []);

    const clearFeedItems = useCallback(() => {
        setFeedItems([]);
    }, []);

    return {
        feedItems,
        updateFeedItem,
        addFeedItem,
        removeFeedItem,
        clearFeedItems,
        generateId
    };
}; 