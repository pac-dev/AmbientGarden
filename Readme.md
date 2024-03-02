# ambient.garden: an Algorithmic Audio Landscape

[ambient.garden](https://ambient.garden/) is a musical landscape in a website. All the music in ambient.garden is generated from code. The music is then laid out in a landscape which can be explored, either interactively, or automatically when the autopilot is left on.

The music of ambient.garden also exists as an album, which is open source and fully generated from code. You can listen to it on streaming platforms ([Spotify](https://open.spotify.com/album/6RPvBkBjCymWOk7BeONDv4), [Apple Music](https://music.apple.com/us/album/a-walk-through-the-ambient-garden/1732863542)) or [build it from source](https://github.com/pac-dev/AmbientGardenAlbum).

## Structure

The website exposes 3 main pages:

- the [default "frozen" landscape](https://ambient.garden/) has full interactivity, but uses pre-rendered audio loops under the hood.
- the [live editable landscape](https://ambient.garden/edit) looks and sounds exactly the same, but plays music from code running in the browser, and features a basic editor mode. CPU-intensive, but still runs in realtime on most laptops.
- the [music source editor](https://ambient.garden/patches) is a basic in-browser code editor to modify and run source code for the music of ambient.garden. It's based on the [Teasynth](https://github.com/pac-dev/Teasynth) web editor.

The structure of the repository

- **MusicSource**: The code for all the music. This folder can be opened as a [Teasynth](https://github.com/pac-dev/Teasynth) project to develop, debug and play the audio code.
	- **_lib**: The "tealib" music programming library made for this project, featuring a node graph, effects, instruments, etc.
	- **\*/main.js**: Every `main.js` file in here is an audio patch that can be played at any location in the landscape.
- **Tools**: Command line tools. See the "Building" section below for usage.
- **Web**: The root for the website, which can be served after generating assets.
	- **versioned**: Source files and assets that get cached. When deploying, this folder can be renamed to the current deployment version name for cache-busting.
		- **generated**: Initially empty, contains audio and compiled code assets after following the "Building" steps below.
		- **js**: The meat of the website code, using [Three.js](https://threejs.org/) for graphics.

## Building

ambient.garden is built as a static website. It's possible to serve the `Web` directory as-is, but some assets need to be generated first. You'll need [deno](https://github.com/denoland/deno/releases) for all the steps below, and [ffmpeg](https://ffmpeg.org/download.html) specifically to render the music tracks.

First, build the music wasm files (for the editable page) and audio loops (for the frozen page):

	deno run -A Tools/build-patches.js
	deno run -A Tools/render-patches.js

Then, generate the landscape maps. This is a hacky, unpolished process where you open a browser and manually save the generated assets. The asset generator page is served, with instructions, by running the following:

	deno run -A Tools/serve-local.js

At this point you can visit the landscape locally at the address given by the above command.

Deployment can be done by pushing the `Web` directory to a static web host. This can be improved with some additional steps: bundling js files, generating the Teasynth editor, and applying a cache-busting strategy. I have a hacky script that does this when deploying to the `ambient.garden` domain, but it needs a bit of cleanup before adding it to the repository.
