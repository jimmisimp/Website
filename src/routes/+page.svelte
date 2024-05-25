<script lang="ts">
    import { items, newItem, addItem, removeItem } from '$lib/index';
    import '$lib/styles.scss';
  </script>
  
  <main>
    <h1>Simple List App</h1>
  
    <input type="text" bind:value={$newItem} placeholder="Add a new item" />
    <button on:click={addItem}>Add</button>
  
    <ul>
      {#each $items as item, index}
        <li>
          {item}
          <button on:click={() => removeItem(index)}>Remove</button>
        </li>
      {/each}
    </ul>
  </main>
  