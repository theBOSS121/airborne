const vertex = `#version 300 es
layout (location = 0) in vec4 aPosition;
layout (location = 1) in vec2 aTexCoord;

uniform mat4 uModelViewProjection;
uniform bool uPerspectiveCorrect;

out vec2 vTexCoord;

void main() {
    vTexCoord = aTexCoord;
    gl_Position = uModelViewProjection * aPosition;

    if (!uPerspectiveCorrect) {
        gl_Position /= gl_Position.w;
    }
}
`;

const fragment = `#version 300 es
precision mediump float;

uniform mediump sampler2D uTexture;
uniform float uTextureScale;

in vec2 vTexCoord;

out vec4 oColor;

void main() {
    oColor = texture(uTexture, vTexCoord * uTextureScale);
}
`;


// const vertex = `#version 300 es
// layout (location = 0) in vec4 aPosition;
// layout (location = 1) in vec4 aColor;

// uniform mat4 uModelViewProjection;
// uniform bool uPerspectiveCorrect;

// out vec4 vColor;

// void main() {
//     vColor = aColor;
//     gl_Position = uModelViewProjection * aPosition;

//     if (!uPerspectiveCorrect) {
//         gl_Position /= gl_Position.w;
//     }
// }
// `;

// const fragment = `#version 300 es
// precision mediump float;

// in vec4 vColor;

// out vec4 oColor;

// void main() {
//     oColor = vColor;
// }
// `;



const firstVertex = `#version 300 es
uniform vec2 uOffset;

layout (location = 0) in vec2 aPosition;
layout (location = 1) in vec4 aColor;

out vec4 vColor;

void main() {
    vColor = aColor;
    gl_Position = vec4(aPosition + uOffset, 0, 1);
}
`;

const firstFragment = `#version 300 es
precision mediump float;

in vec4 vColor;

out vec4 oColor;

void main() {
    oColor = vColor;
}
`;

const secondVertex = `#version 300 es
uniform vec2 uOffset;
uniform vec2 uScale;

layout (location = 0) in vec2 aPosition;
layout (location = 1) in vec4 aColor;

out vec4 vColor;

void main() {
    vColor = vec4(1) - aColor;
    vColor.a = 1.0;
    gl_Position = vec4(aPosition * uScale + uOffset, 0, 1);
}
`;

const secondFragment = `#version 300 es
precision mediump float;

in vec4 vColor;

out vec4 oColor;

void main() {
    oColor = vColor;
}
`;

export const shaders = {
    simple: { vertex, fragment },
    first: {
        vertex   : firstVertex,
        fragment : firstFragment
    },
    second: {
        vertex   : secondVertex,
        fragment : secondFragment
    }
};
