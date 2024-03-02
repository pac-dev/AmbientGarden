export const aboutContent = `
<div class=album_box>
    <span>get the music</span>
	<b>Pure Code - A Walk Through the Ambient Garden</b>
	<a href="https://open.spotify.com/album/6RPvBkBjCymWOk7BeONDv4" target="_blank">Spotify</a>
	<a href="https://music.apple.com/us/album/a-walk-through-the-ambient-garden/1732863542" target="_blank">Apple Music</a>
	<a href="https://github.com/pac-dev/AmbientGardenAlbum" target="_blank">source code on Github</a>
</div>
`+`
# About ambient.garden

ambient.garden is an experiment that started with the question: can a composition be organized in space rather than time? Can it be experienced in space by the listener? To explore this concept, all the sounds and graphics were entirely generated from <a href="https://github.com/pac-dev/AmbientGarden">open source code</a>. The sounds of ambient.garden were assembled and grown into a music album, <i>A Walk Through the Ambient Garden</i>, <a href="https://github.com/pac-dev/AmbientGardenAlbum">also open source</a>.

## Generative Aspects

Generative art is art that is generated from an autonomous process, like code. My approach is to rely on a generative base, but to turn to hand-crafting elements when fine control is needed. In ambient.garden, the layout and tuning of the musical forest is done by hand, but everything else is generated from code.

On the visual side, classic generative techniques are used, some of them reworked for the pointillist aesthetic. The terrain is based on [Perlin noise and FBM](https://thebookofshaders.com/13/). The trees make use of the golden angle and L-systems.

On the sonic side, all elements are generative, to the point of avoiding the use of any recorded samples. The chosen synthesis techniques mostly focus on physical modeling (waveguides, modal synthesis) aiming for an organic sound. All harmony is in just intonation, allowing for simpler manipulation of notes as ratios of each other. Deeper explanations can be found in [the code itself](https://ambient.garden/patches).

## About the Author

ambient.garden is a project by Pierre Cusa. My other works include [more music](https://www.cusamusic.com/), mostly film soundtracks and related genres, and [other experimental programming projects](https://osar.fr/).
`
.replace(/^([^#\n].*)$/gm, '<p>$1</p>')
.replace(/^# (.*)$/gm, '<h1>$1</h1>')
.replace(/^## (.*)$/gm, '<h2>$1</h2>')
.replace(/\[(.*?)\]\((.*?)\)/gm, '<a href="$2" target="_blank">$1</a>');