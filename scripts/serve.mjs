// Rebuilds dist/ on every source change and serves it, so you test the real single-file bundle.
import { build, preview } from 'vite';

const watcher = await build({ build: { watch: {} } });

// Wait for the first build before serving, otherwise dist/ may not exist yet.
await new Promise((resolve) => {
  watcher.on('event', (event) => {
    if (event.code === 'END') resolve();
    if (event.code === 'ERROR') console.error(event.error);
  });
});

const server = await preview({ preview: { port: 4173, open: false } });
server.printUrls();
console.log('\nWatching for changes — refresh the page after a rebuild.');
