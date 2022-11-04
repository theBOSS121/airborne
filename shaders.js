const vertex = `#version 300 es
layout (location = 0) in vec4 aPosition;
layout (location = 1) in vec2 aTexCoord;

uniform mat4 uModelViewProjection;

out vec2 vTexCoord;

void main() {
    vTexCoord = aTexCoord;
    gl_Position = uModelViewProjection * aPosition;
}
`;

const fragment = `#version 300 es
precision mediump float;

uniform mediump sampler2D uTexture;

in vec2 vTexCoord;

out vec4 oColor;

void main() {
    oColor = texture(uTexture, vTexCoord);
}
`;

export const shaders = {
    simple: { vertex, fragment }
};



// const simpleVertex = `#version 300 es
// layout (location = 0) in vec2 aPosition;

// uniform mat2 uTransform;

// void main() {
//     gl_Position = vec4(uTransform * aPosition, 0, 1);
// }
// `;

// const simpleFragment = `#version 300 es
// precision mediump float;

// out vec4 oColor;

// void main() {
//     oColor = vec4(1, 0, 0, 1);
// }
// `;

// const texturedVertex = `#version 300 es
// layout (location = 0) in vec2 aPosition;
// layout (location = 1) in vec2 aTexCoord;

// uniform mat2 uTransform;

// out vec2 vTexCoord;

// void main() {
//     vTexCoord = aTexCoord;
//     gl_Position = vec4(uTransform * aPosition, 0, 1);
// }
// `;

// const texturedFragment = `#version 300 es
// precision mediump float;

// uniform sampler2D uTexture;

// in vec2 vTexCoord;

// out vec4 oColor;

// void main() {
//     oColor = texture(uTexture, vTexCoord);
// }
// `;

// const vertex = `#version 300 es
// layout (location = 0) in vec4 aPosition;
// layout (location = 1) in vec2 aTexCoord;

// uniform mat4 uModelViewProjection;
// uniform bool uPerspectiveCorrect;

// out vec2 vTexCoord;

// void main() {
//     vTexCoord = aTexCoord;
//     gl_Position = uModelViewProjection * aPosition;

//     if (!uPerspectiveCorrect) {
//         gl_Position /= gl_Position.w;
//     }
// }
// `;

// const fragment = `#version 300 es
// precision mediump float;

// uniform mediump sampler2D uTexture;
// uniform float uTextureScale;

// in vec2 vTexCoord;

// out vec4 oColor;

// void main() {
//     oColor = texture(uTexture, vTexCoord * uTextureScale);
// }
// `;


// // const vertex = `#version 300 es
// // layout (location = 0) in vec4 aPosition;
// // layout (location = 1) in vec4 aColor;

// // uniform mat4 uModelViewProjection;
// // uniform bool uPerspectiveCorrect;

// // out vec4 vColor;

// // void main() {
// //     vColor = aColor;
// //     gl_Position = uModelViewProjection * aPosition;

// //     if (!uPerspectiveCorrect) {
// //         gl_Position /= gl_Position.w;
// //     }
// // }
// // `;

// // const fragment = `#version 300 es
// // precision mediump float;

// // in vec4 vColor;

// // out vec4 oColor;

// // void main() {
// //     oColor = vColor;
// // }
// // `;



// const firstVertex = `#version 300 es
// uniform vec2 uOffset;

// layout (location = 0) in vec2 aPosition;
// layout (location = 1) in vec4 aColor;

// out vec4 vColor;

// void main() {
//     vColor = aColor;
//     gl_Position = vec4(aPosition + uOffset, 0, 1);
// }
// `;

// const firstFragment = `#version 300 es
// precision mediump float;

// in vec4 vColor;

// out vec4 oColor;

// void main() {
//     oColor = vColor;
// }
// `;

// const secondVertex = `#version 300 es
// uniform vec2 uOffset;
// uniform vec2 uScale;

// layout (location = 0) in vec2 aPosition;
// layout (location = 1) in vec4 aColor;

// out vec4 vColor;

// void main() {
//     vColor = vec4(1) - aColor;
//     vColor.a = 1.0;
//     gl_Position = vec4(aPosition * uScale + uOffset, 0, 1);
// }
// `;

// const secondFragment = `#version 300 es
// precision mediump float;

// in vec4 vColor;

// out vec4 oColor;

// void main() {
//     oColor = vColor;
// }
// `;

// export const shaders = {
//     // simple: {
//     //     vertex   : simpleVertex,
//     //     fragment : simpleFragment
//     // },
//     textured: {
//         vertex   : texturedVertex,
//         fragment : texturedFragment
//     },
//     simple: { vertex, fragment },
//     first: {
//         vertex   : firstVertex,
//         fragment : firstFragment
//     },
//     second: {
//         vertex   : secondVertex,
//         fragment : secondFragment
//     }
// };
