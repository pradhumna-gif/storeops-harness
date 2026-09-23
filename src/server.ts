import { createApp } from './app';
const port = Number(process.env.PORT ?? 3000);
// eslint-disable-next-line no-console -- process entry point: the single permitted startup log line
createApp().listen(port, () => console.log(`StoreOps listening on port ${port}`));
