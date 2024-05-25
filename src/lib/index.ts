import { writable } from 'svelte/store';

export const items = writable<string[]>([]);
export const newItem = writable<string>('');

export function addItem() {
  newItem.update(value => {
    if (value.trim() !== '') {
      items.update(currentItems => [...currentItems, value]);
      return '';
    }
    return value;
  });
}

export function removeItem(index: number) {
  items.update(currentItems => currentItems.filter((_, i) => i !== index));
}
