import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-static';

const config = {
  preprocess: preprocess({
    typescript: true,
    scss: {
      includePaths: ['src'],
    },
  }),

  kit: {
    adapter: adapter()
  }
};

export default config;
