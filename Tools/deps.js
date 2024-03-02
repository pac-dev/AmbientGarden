// Switch between local copy and published version here:
export { MultiRenderer, build } from 'https://raw.githubusercontent.com/pac-dev/Teasynth/v1.0.1/teasynth.js';
// export { MultiRenderer, build } from '../../Teasynth/teasynth.js';

export * as path from 'https://deno.land/std@0.217.0/path/mod.ts';
export { copy, exists } from 'https://deno.land/std@0.217.0/fs/mod.ts';
export { parse } from 'https://deno.land/std@0.217.0/flags/mod.ts';
export { serveDir } from 'https://deno.land/std@0.217.0/http/file_server.ts';
