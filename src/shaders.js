// shaders with light per fragment, enivronment mapping (reflecion/refration), materials
const perFragmentWithEnvmapVertexShader = `#version 300 es
layout (location = 0) in vec3 aPosition;
layout (location = 1) in vec2 aTexCoord;
layout (location = 2) in vec3 aNormal;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

out vec3 vPosition;
out vec3 vNormal;
out vec2 vTexCoord;

void main() {
    vPosition = (uModelMatrix * vec4(aPosition, 1)).xyz;
    vNormal = mat3(uModelMatrix) * aNormal;
    vTexCoord = aTexCoord;

    gl_Position = uProjectionMatrix * (uViewMatrix * vec4(vPosition, 1));
}
`;

const perFragmentWithEnvmapFragmentShader = `#version 300 es
precision mediump float;

uniform mediump sampler2D uTexture;
uniform mediump sampler2D uEnvmap;

uniform vec3 uCameraPosition;
uniform float uReflectance;
uniform float uTransmittance;
uniform float uIOR;
uniform float uEffect;

struct Light {
    vec3 position;
    vec3 attenuation;
    vec3 color;
};

struct Material {
    float diffuse;
    float specular;
    float shininess;
};

uniform Light uLight;
uniform Material uMaterial;

in vec3 vPosition;
in vec3 vNormal;
in vec2 vTexCoord;

out vec4 oColor;

vec2 directionToTexcoord(vec3 v) {
    const float PI = 3.14159265358979;
    return vec2((atan(v.z, v.x) / PI) * 0.5 + 0.5, acos(v.y) / PI);
}

void main() {
    float d = distance(vPosition, uLight.position);
    // further from the light it should be darker 1/ (2nd degree polinomial in distance to the light)
    float attenuation = 1.0 / dot(uLight.attenuation, vec3(1, d, d * d));

    vec3 N = normalize(vNormal); // fragment normal
    vec3 L = normalize(uLight.position - vPosition); // vec from fragment to light
    vec3 E = normalize(uCameraPosition - vPosition); // vec from fragment to camera
    vec3 R = normalize(reflect(-L, N)); // vec reflected from light over the normal
    vec3 R2 = reflect(-E, N); // vec reflected from camera over the normal
    vec3 T = refract(-E, N, uIOR); // vec refracted from camera over normal with uIOR

    // lights
    // diffuse light effected by cos(angle between normal and light)
    float lambert = max(0.0, dot(L, N)) * uMaterial.diffuse;
    // cos(angle between camera and light reflection (over normal))^shininess * specular
    // for specular light
    float phong = pow(max(0.0, dot(E, R)), uMaterial.shininess) * uMaterial.specular;
    // diffuseLight is depended on materialDiffuseColor (lambert), light color (uLight) and attenuation
    vec3 diffuseLight = lambert * uLight.color * attenuation;
    // specularLight is depended on materialSpecularColor (phong), light color (uLight) and attenuation
    vec3 specularLight = phong * uLight.color * attenuation;

    const float gamma = 2.2;
    // get texture color for fragment and power it to the gamma (albedo)
    vec3 albedo = pow(texture(uTexture, vTexCoord).rgb, vec3(gamma));
    // color = albedo * max(diffuseLight, ambientLight) + specularLight
    vec3 finalColor = albedo * max(diffuseLight, vec3(0.007,0.007,0.007)) + specularLight;

    // oColor = pow(vec4(finalColor, 1), vec4(1.0 / gamma));
    
    // reflections / transparency
    // get surface color
    vec4 surfaceColor = texture(uTexture, vTexCoord);
    // get reflectedColor from environment map
    vec4 reflectedColor = texture(uEnvmap, directionToTexcoord(R2));
    // get refractedColor from environment map
    vec4 refractedColor = texture(uEnvmap, directionToTexcoord(T));

    // mixing reflection/refration to the surface using (uReflectance/uTransmittance)
    vec4 reflection = mix(surfaceColor, reflectedColor, uReflectance);
    vec4 refraction = mix(surfaceColor, refractedColor, uTransmittance);

    // oColor = mix(reflection, refraction, uEffect);

    // mixing color from lights and reflection/refration
    // TODO: maybe not a good color mixture
    oColor = 0.5 * pow(vec4(finalColor, 1), vec4(1.0 / gamma)) + 0.5 * mix(reflection, refraction, uEffect);
}
`;

// skybox shaders
const skyboxVertex = `#version 300 es
layout (location = 0) in vec3 aPosition; // vertex position

uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

out vec3 vPosition; // vertex position not transformed

void main() {
    vPosition = aPosition;
    vec3 rotated = mat3(uViewMatrix) * aPosition;
    vec4 projected = uProjectionMatrix * vec4(rotated, 1);
    gl_Position = projected.xyww;
}
`;

const skyboxFragment = `#version 300 es
precision mediump float;

uniform mediump sampler2D uEnvmap;

in vec3 vPosition;

out vec4 oColor;

vec2 directionToTexcoord(vec3 v) {
    const float PI = 3.14159265358979;
    return vec2((atan(v.z, v.x) / PI) * 0.5 + 0.5, acos(v.y) / PI);
}

void main() {
    // color from environment in the direction of (not transformed but interpolated vPosition)
    oColor = texture(uEnvmap, directionToTexcoord(normalize(vPosition)));
}
`;


const nishitaVertex = `#version 300 es

const vec2 vertices[] = vec2[](
    vec2(-1, -1),
    vec2( 3, -1),
    vec2(-1,  3)
);

out vec2 vPosition;

void main() {
    vec2 position = vertices[gl_VertexID];
    vPosition = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0, 1);
}
`;

const nishitaFragment = `#version 300 es
precision highp float;

// geometry
uniform float uPlanetRadius;
uniform float uAtmosphereRadius;
uniform float uCameraAltitude;
uniform vec3 uSunDirection;

// physics
uniform float uSunIntensity;
uniform float uMieScatteringAnisotropy;
uniform vec3 uMieScatteringCoefficient;
uniform float uMieDensityScale;
uniform vec3 uRayleighScatteringCoefficient;
uniform float uRayleighDensityScale;

// integration
uniform uint uPrimaryRaySamples;
uniform uint uSecondaryRaySamples;

uniform float uTime;

in vec2 vPosition;

out vec4 oColor;

const float PI = 3.14159265358979;

vec3 directionFromTexcoord(vec2 texcoord) {
    float sx = sin(vPosition.x * 2.0 * PI);
    float sy = sin(vPosition.y * PI);
    float cx = cos(vPosition.x * 2.0 * PI);
    float cy = cos(vPosition.y * PI);
    return vec3(cx * sy, cy, sx * sy);
}

bool raySphereIntersection(vec3 origin, vec3 direction, float radius, out float t0, out float t1) {
    float a = dot(direction, direction);
    float b = dot(direction, origin) * 2.0;
    float c = dot(origin, origin) - radius * radius;

    float D = b * b - 4.0 * a * c;

    if (D < 0.0) {
        return false;
    }

    D = sqrt(D);
    t0 = (-b - D) / (2.0 * a);
    t1 = (-b + D) / (2.0 * a);

    if (t1 < 0.0) {
        return false;
    }

    t0 = max(t0, 0.0);

    return true;
}

float miePhaseFunction(float cosine, float anisotropy) {
    float g = anisotropy;
    float mu = cosine;
    float g2 = g * g;
    float mu2 = mu * mu;
    float gmu = g * mu;
    return 3.0 / (8.0 * PI) * ((1.0 - g2) * (1.0 + mu2)) /
        ((2.0 + g2) * pow(1.0 + g2 - 2.0 * gmu, 3.0 / 2.0));
}

float rayleighPhaseFunction(float cosine) {
    float mu = cosine;
    float mu2 = mu * mu;
    return 3.0 / (16.0 * PI) * (1.0 + mu2);
}

vec3 rayleighScatteringCoefficient(float height) {
    return uRayleighScatteringCoefficient * exp(-height / uRayleighDensityScale);
}

vec3 mieScatteringCoefficient(float height) {
    return uMieScatteringCoefficient * exp(-height / uMieDensityScale);
}

vec3 rayleighAbsorptionCoefficient(float height) {
    return vec3(0);
}

vec3 mieAbsorptionCoefficient(float height) {
    return mieScatteringCoefficient(height) * 0.1;
}

vec3 radianceSecondaryRay(vec3 origin, vec3 direction) {
    float tnear, tfar;

    // If the secondary ray is in shadow, there is no radiance, because
    // we assumed no emission or higher order scettering.
    if (raySphereIntersection(origin, direction, uPlanetRadius, tnear, tfar)) {
        return vec3(0);
    }

    raySphereIntersection(origin, direction, uAtmosphereRadius, tnear, tfar);

    vec3 near = origin + tnear * direction;
    vec3 far = origin + tfar * direction;

    // Calculate transmittance along the secondary ray by first integrating
    // the optical depth and then calculating the exponential.
    float segmentLength = distance(near, far) / float(uSecondaryRaySamples);
    vec3 opticalDepth = vec3(0);

    for (uint i = 0u; i < uSecondaryRaySamples; i++) {
        vec3 position = near + segmentLength * direction;
        float height = length(position) - uPlanetRadius;

        opticalDepth += rayleighAbsorptionCoefficient(height);
        opticalDepth += rayleighScatteringCoefficient(height);
        opticalDepth += mieAbsorptionCoefficient(height);
        opticalDepth += mieScatteringCoefficient(height);
    }

    // Assume the sun is white.
    vec3 sunRadiance = vec3(uSunIntensity);
    vec3 transmittance = exp(-opticalDepth * segmentLength);
    return transmittance * sunRadiance;
}

vec3 radiancePrimaryRay(vec3 origin, vec3 direction) {
    float tnear, tfar;

    // If the ray does not intersect the atmosphere, there is no radiance, because
    // we assumed no background radiance.
    if (!raySphereIntersection(origin, direction, uAtmosphereRadius, tnear, tfar)) {
        return vec3(0);
    }

    // Two options remain: the ray hits the planet or exits the atmosphere.
    // We can handle both situations by integrating only up to the appropriate intersection.
    float tPlanetNear, tPlanetFar;
    if (raySphereIntersection(origin, direction, uPlanetRadius, tPlanetNear, tPlanetFar)) {
        tfar = tPlanetNear;
    }

    vec3 near = origin + tnear * direction;
    vec3 far = origin + tfar * direction;

    float scatteringCosine = dot(direction, uSunDirection);
    float rayleighPhase = rayleighPhaseFunction(scatteringCosine);
    float miePhase = miePhaseFunction(scatteringCosine, uMieScatteringAnisotropy);

    vec3 radiance = vec3(0);

    // Calculate transmittance along the secondary ray by first integrating
    // the optical depth and then calculating the exponential.
    float segmentLength = distance(near, far) / float(uPrimaryRaySamples);
    vec3 opticalDepth = vec3(0);

    for (uint i = 0u; i < uPrimaryRaySamples; i++) {
        vec3 position = near + segmentLength * direction;
        float height = length(position) - uPlanetRadius;

        opticalDepth += rayleighAbsorptionCoefficient(height);
        opticalDepth += rayleighScatteringCoefficient(height);
        opticalDepth += mieAbsorptionCoefficient(height);
        opticalDepth += mieScatteringCoefficient(height);

        vec3 transmittance = exp(-opticalDepth * segmentLength);

        vec3 incidentRadiance = radianceSecondaryRay(position, uSunDirection);

        vec3 rayleigh = rayleighScatteringCoefficient(height) * rayleighPhase;
        vec3 mie = mieScatteringCoefficient(height) * miePhase;
        radiance += transmittance * (rayleigh + mie) * incidentRadiance * segmentLength;
    }

    return radiance;
}

void main() {
    vec3 position = vec3(0, uPlanetRadius + uCameraAltitude, 0);
    vec3 direction = directionFromTexcoord(vPosition);

    oColor = vec4(radiancePrimaryRay(position, direction), 1);
}
`;

const skyboxNishitaVertex = `#version 300 es

const vec2 vertices[] = vec2[](
    vec2(-1, -1),
    vec2( 3, -1),
    vec2(-1,  3)
);

uniform mat4 uUnprojectMatrix;

out vec3 vDirection;

vec3 unproject(vec3 devicePosition) {
    vec4 clipPosition = uUnprojectMatrix * vec4(devicePosition, 1);
    return clipPosition.xyz / clipPosition.w;
}

void main() {
    vec2 position = vertices[gl_VertexID];
    vec3 near = unproject(vec3(position, -1));
    vec3 far = unproject(vec3(position, 1));
    vDirection = far - near;
    gl_Position = vec4(position, 0, 1);
}
`;

const skyboxNishitaFragment = `#version 300 es
precision mediump float;

uniform mediump sampler2D uSkybox;

in vec3 vDirection;

out vec4 oColor;

vec2 directionToTexcoord(vec3 v) {
    const float PI = 3.14159265358979;
    return vec2((atan(v.z, v.x) / PI) * 0.5 + 0.5, acos(v.y) / PI);
}

void main() {
    oColor = texture(uSkybox, directionToTexcoord(normalize(vDirection)));
    oColor = pow(oColor, vec4(vec3(1.0 / 2.2), 1));
    // if(vDirection[0] >= 0.0) {
    // }
    // oColor = vec4(1, 0, 0, 1);
}
`;


export const shaders = {
    perFragmentWithEnvmap: {        
        vertex: perFragmentWithEnvmapVertexShader,
        fragment: perFragmentWithEnvmapFragmentShader,
    },
    skybox: {
        vertex: skyboxVertex,
        fragment: skyboxFragment,
    },
    nishita: {
        vertex: nishitaVertex,
        fragment: nishitaFragment,
    },
    skyboxNishita: {
        vertex: skyboxNishitaVertex,
        fragment: skyboxNishitaFragment,
    },
};

// --------------------------------------------------------------
// --------------------------------------------------------------
// Examples of shaders ------------------------------------------
// --------------------------------------------------------------
// --------------------------------------------------------------

// const vertex = `#version 300 es

// layout (location = 0) in vec4 aPosition;
// layout (location = 3) in vec2 aTexCoord;

// uniform mat4 uModelViewProjection;

// out vec2 vTexCoord;

// void main() {
//     vTexCoord = aTexCoord;
//     gl_Position = uModelViewProjection * aPosition;
// }
// `;

// const fragment = `#version 300 es
// precision mediump float;
// precision mediump sampler2D;

// uniform sampler2D uBaseColorTexture;
// uniform vec4 uBaseColorFactor;

// in vec2 vTexCoord;

// out vec4 oColor;

// void main() {
//     vec4 baseColor = texture(uBaseColorTexture, vTexCoord);
//     oColor = uBaseColorFactor * baseColor;
// }
// `;


// const envmapVertex = `#version 300 es
// layout (location = 0) in vec3 aPosition;
// layout (location = 1) in vec2 aTexCoord;
// layout (location = 2) in vec3 aNormal;

// uniform mat4 uModelMatrix;
// uniform mat4 uViewMatrix;
// uniform mat4 uProjectionMatrix;

// out vec3 vPosition;
// out vec2 vTexCoord;
// out vec3 vNormal;

// void main() {
//     vec3 surfacePosition = (uModelMatrix * vec4(aPosition, 1)).xyz;

//     vPosition = surfacePosition;
//     vNormal = mat3(uModelMatrix) * aNormal;
//     vTexCoord = aTexCoord;

//     gl_Position = uProjectionMatrix * (uViewMatrix * vec4(surfacePosition, 1));
// }
// `;

// const envmapFragment = `#version 300 es
// precision mediump float;

// uniform mediump sampler2D uTexture;
// uniform mediump sampler2D uEnvmap;

// uniform vec3 uCameraPosition;
// uniform float uReflectance;
// uniform float uTransmittance;
// uniform float uIOR;
// uniform float uEffect;

// in vec3 vPosition;
// in vec2 vTexCoord;
// in vec3 vNormal;

// out vec4 oColor;

// vec2 directionToTexcoord(vec3 v) {
//     const float PI = 3.14159265358979;
//     return vec2((atan(v.z, v.x) / PI) * 0.5 + 0.5, acos(v.y) / PI);
// }

// void main() {
//     vec3 N = normalize(vNormal);
//     vec3 V = normalize(uCameraPosition - vPosition);
//     vec3 R = reflect(-V, N);
//     vec3 T = refract(-V, N, uIOR);

//     vec4 surfaceColor = texture(uTexture, vTexCoord);
//     vec4 reflectedColor = texture(uEnvmap, directionToTexcoord(R));
//     vec4 refractedColor = texture(uEnvmap, directionToTexcoord(T));

//     vec4 reflection = mix(surfaceColor, reflectedColor, uReflectance);
//     vec4 refraction = mix(surfaceColor, refractedColor, uTransmittance);

//     oColor = mix(reflection, refraction, uEffect);
// }
// `;

// const perVertexVertexShader = `#version 300 es
// layout (location = 0) in vec3 aPosition;
// layout (location = 1) in vec2 aTexCoord;
// layout (location = 2) in vec3 aNormal;

// uniform mat4 uModelMatrix;
// uniform mat4 uViewMatrix;
// uniform mat4 uProjectionMatrix;

// uniform vec3 uCameraPosition;

// struct Light {
//     vec3 position;
//     vec3 attenuation;
//     vec3 color;
// };

// struct Material {
//     float diffuse;
//     float specular;
//     float shininess;
// };

// uniform Light uLight;
// uniform Material uMaterial;

// out vec2 vTexCoord;
// out vec3 vDiffuseLight;
// out vec3 vSpecularLight;

// void main() {
//     vec3 surfacePosition = (uModelMatrix * vec4(aPosition, 1)).xyz;

//     float d = distance(surfacePosition, uLight.position);
//     float attenuation = 1.0 / dot(uLight.attenuation, vec3(1, d, d * d));

//     vec3 N = normalize(mat3(uModelMatrix) * aNormal);
//     vec3 L = normalize(uLight.position - surfacePosition);
//     vec3 E = normalize(uCameraPosition - surfacePosition);
//     vec3 R = normalize(reflect(-L, N));

//     float lambert = max(0.0, dot(L, N)) * uMaterial.diffuse;
//     float phong = pow(max(0.0, dot(E, R)), uMaterial.shininess) * uMaterial.specular;

//     vDiffuseLight = lambert * attenuation * uLight.color;
//     vSpecularLight = phong * attenuation * uLight.color;

//     vTexCoord = aTexCoord;
//     gl_Position = uProjectionMatrix * (uViewMatrix * vec4(surfacePosition, 1));
// }
// `;

// const perVertexFragmentShader = `#version 300 es
// precision mediump float;

// uniform mediump sampler2D uTexture;

// in vec2 vTexCoord;
// in vec3 vDiffuseLight;
// in vec3 vSpecularLight;

// out vec4 oColor;

// void main() {
//     const float gamma = 2.2;
//     vec3 albedo = pow(texture(uTexture, vTexCoord).rgb, vec3(gamma));
//     vec3 finalColor = albedo * vDiffuseLight + vSpecularLight;
//     oColor = pow(vec4(finalColor, 1), vec4(1.0 / gamma));
// }
// `;

// const perFragmentVertexShader = `#version 300 es
// layout (location = 0) in vec3 aPosition;
// layout (location = 1) in vec2 aTexCoord;
// layout (location = 2) in vec3 aNormal;

// uniform mat4 uModelMatrix;
// uniform mat4 uViewMatrix;
// uniform mat4 uProjectionMatrix;

// out vec3 vPosition;
// out vec3 vNormal;
// out vec2 vTexCoord;

// void main() {
//     vPosition = (uModelMatrix * vec4(aPosition, 1)).xyz;
//     vNormal = mat3(uModelMatrix) * aNormal;
//     vTexCoord = aTexCoord;

//     gl_Position = uProjectionMatrix * (uViewMatrix * vec4(vPosition, 1));
// }
// `;

// const perFragmentFragmentShader = `#version 300 es
// precision mediump float;

// uniform mediump sampler2D uTexture;

// uniform vec3 uCameraPosition;

// struct Light {
//     vec3 position;
//     vec3 attenuation;
//     vec3 color;
// };

// struct Material {
//     float diffuse;
//     float specular;
//     float shininess;
// };

// uniform Light uLight;
// uniform Material uMaterial;

// in vec3 vPosition;
// in vec3 vNormal;
// in vec2 vTexCoord;

// out vec4 oColor;

// void main() {
//     vec3 surfacePosition = vPosition;

//     float d = distance(surfacePosition, uLight.position);
//     float attenuation = 1.0 / dot(uLight.attenuation, vec3(1, d, d * d));

//     vec3 N = normalize(vNormal);
//     vec3 L = normalize(uLight.position - surfacePosition);
//     vec3 E = normalize(uCameraPosition - surfacePosition);
//     vec3 R = normalize(reflect(-L, N));

//     float lambert = max(0.0, dot(L, N)) * uMaterial.diffuse;
//     float phong = pow(max(0.0, dot(E, R)), uMaterial.shininess) * uMaterial.specular;

//     vec3 diffuseLight = lambert * attenuation * uLight.color;
//     vec3 specularLight = phong * attenuation * uLight.color;

//     const float gamma = 2.2;
//     vec3 albedo = pow(texture(uTexture, vTexCoord).rgb, vec3(gamma));
//     vec3 finalColor = albedo * max(diffuseLight, vec3(0.005,0.005,0.005)) + specularLight;
//     oColor = pow(vec4(finalColor, 1), vec4(1.0 / gamma));
// }
// `;

// const vertex = `#version 300 es
// layout (location = 0) in vec4 aPosition;
// layout (location = 1) in vec2 aTexCoord;

// uniform mat4 uModelViewProjection;

// out vec2 vTexCoord;

// void main() {
//     vTexCoord = aTexCoord;
//     gl_Position = uModelViewProjection * aPosition;
// }
// `;

// const fragment = `#version 300 es
// precision mediump float;

// uniform mediump sampler2D uTexture;

// in vec2 vTexCoord;

// out vec4 oColor;

// void main() {
//     oColor = texture(uTexture, vTexCoord);
// }
// `;

// export const shaders = {
//     simple: { vertex, fragment }
// };



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
