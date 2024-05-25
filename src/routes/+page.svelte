<script lang="ts">
    import { items, newItem, addItem, removeItem } from '$lib/index';
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
  
  <style lang="scss">
    main {
      max-width: 600px;
      margin: 0 auto;
      padding: 2rem;
      font-family: Arial, sans-serif;
  
      h1 {
        text-align: center;
      }
  
      input {
        padding: 0.5rem;
        font-size: 1rem;
      }
  
      button {
        margin-left: 0.5rem;
        padding: 0.5rem 1rem;
        font-size: 1rem;
      }
  
      ul {
        list-style-type: none;
        padding: 0;
      }
  
      li {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
      }
    }
  </style>
  