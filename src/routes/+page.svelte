<script lang="ts">
    import { onMount } from 'svelte';
    import '$lib/styles.scss';

    let items: string[] = [];
    let newItem = '';

    const addItem = () => {
        if (newItem.trim() !== '' && !items.includes(newItem.trim())) {
            items = [...items, newItem.trim()];
            newItem = '';
        } else {
            alert("Item already exists or is empty!");
        }
    };

    const removeItem = (index: number) => {
        items = items.filter((_, i) => i !== index);
    };
</script>

<div class="list-container">
    <h1>Simple List App</h1>
    <input type="text" bind:value={newItem} placeholder="Add a new item" />
    <button on:click={addItem}>Add</button>
    <ul>
        {#each items as item, index}
            <li>
                {item} <button on:click={() => removeItem(index)}>Remove</button>
            </li>
        {/each}
    </ul>
</div>
