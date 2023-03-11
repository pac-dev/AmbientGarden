export const aboutContent = `
# About Ambient.Garden

Ambient.Garden is an experiment that started with the question: can a composition be organized in space rather than time? Can it be experienced in space by the listener? It's now evolved into a practice of "composing as gardening", so you can expect Ambient.Garden to keep changing as the garden is tended to.

## Generative Aspects

Generative art is art that is generated from code. An effective approach is to rely on a generative base, but to turn to hand-crafting elements when fine control is needed. In Ambient.Garden, the layout and tuning of the musical forest is done by hand, but essentially everything else is written as code.

On the visual side, classic generative techniques are used, some of them reworked for the pointillist aesthetic. The terrain is based on [Perlin noise and FBM](https://thebookofshaders.com/13/). The trees make use of the golden angle and L-systems.

On the sonic side, all elements are generative, to the point of avoiding the use of any recorded samples. The chosen synthesis techniques mostly focus on physical modeling (waveguides, modal synthesis) aiming for an organic sound. All harmony is in natural temperament, allowing a more direct link from theory and code to sound. Deeper explanations can be found in [the code itself](https://ambient.garden/tracks).

## About the Author

Ambient.Garden is a project by Pierre Cusa. My other works include [music](https://www.cusamusic.com/), mostly film soundtracks and related genres, and [other experimental programming projects](https://osar.fr/).
`
.replace(/^([^#\n].*)$/gm, '<p>$1</p>')
.replace(/^# (.*)$/gm, '<h1>$1</h1>')
.replace(/^## (.*)$/gm, '<h2>$1</h2>')
.replace(/\[(.*?)\]\((.*?)\)/gm, '<a href="$2" target="_blank">$1</a>');