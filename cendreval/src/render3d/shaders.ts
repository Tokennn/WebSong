/** Nombre maximal de feux éclairant la scène en même temps. */
export const MAX_LIGHTS = 12;
/** Nombre maximal d'ombres de dragons projetées au sol. */
export const MAX_BLOBS = 4;

export const VERTEX = /* glsl */ `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aInfo;
uniform mat4 uViewProj;
out vec3 vWorld;
flat out vec3 vInfo;
void main() {
  vWorld = aPos;
  vInfo = aInfo;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}
`;

/**
 * La scène n'est jamais affichée telle quelle : on écrit un G-buffer que le CPU
 * transforme en glyphes.
 *  0 : lumière reçue (rgb / 2) + orientation vers le ciel
 *  1 : case propriétaire (x, y sur 9 bits) + type de face + petit hash "collé à la surface"
 *  2 : profondeur sur 16 bits + normale dans l'espace écran
 */
export const FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

in vec3 vWorld;
flat in vec3 vInfo;

uniform sampler2D uField;     // RG16F : terrain lissé (filtré), construction (-100 = rien)
uniform vec2 uWorld;          // largeur, hauteur du monde en cases
uniform float uZ;             // Z = y * uZ
uniform float uMaxH;
uniform vec3 uEye, uFwd, uRight, uUp;
uniform float uDepthScale;
uniform float uTime;
uniform float uFine;          // finesse du grain de glyphes (suit le zoom)
uniform vec3 uMoonDir, uMoonCol, uSkyCol;
uniform vec3 uTorchPos, uTorchCol;
uniform float uTorchR;
uniform int uNLights;
uniform vec4 uLightPos[${MAX_LIGHTS}];
uniform vec3 uLightCol[${MAX_LIGHTS}];
uniform vec4 uBlob[${MAX_BLOBS}];

layout(location = 0) out vec4 oLight;
layout(location = 1) out vec4 oTile;
layout(location = 2) out vec4 oGeo;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Hauteur de la scène sous un point : terrain interpolé (filtrage matériel),
// constructions lues case par case pour garder des arêtes nettes.
float H(vec2 xz) {
  vec2 t = vec2(xz.x, xz.y / uZ);
  float terrain = texture(uField, t / uWorld).r;
  float built = texelFetch(uField, clamp(ivec2(floor(t)), ivec2(0), ivec2(uWorld) - 1), 0).g;
  return max(terrain, built);
}

// Ombre douce vers une direction (la lune) : marche dans le champ de hauteur.
float sunShadow(vec3 p, vec3 L) {
  float s = 1.0;
  float t = 0.35;
  for (int i = 0; i < 20; i++) {
    vec3 q = p + L * t;
    if (q.y > uMaxH) break;
    float d = q.y - H(q.xz);
    s = min(s, clamp(5.0 * d / t + 0.15, 0.0, 1.0));
    if (s < 0.02) break;
    t += clamp(t * 0.22, 0.4, 2.6);
  }
  return s;
}

// Ombre vers une lumière ponctuelle (torche, feux).
float pointShadow(vec3 p, vec3 lp, int steps) {
  vec3 dv = lp - p;
  float len = length(dv);
  float s = 1.0;
  for (int i = 1; i < 16; i++) {
    if (i >= steps) break;
    float k = float(i) / float(steps);
    vec3 q = p + dv * k;
    float d = q.y - H(q.xz);
    s = min(s, clamp(3.0 * d / (len * k) + 0.2, 0.0, 1.0));
  }
  return s;
}

// Occlusion ambiante : ce qui dépasse autour assombrit (pied des murs, sous-bois).
float occlusion(vec3 p) {
  float o = 0.0;
  for (int i = 0; i < 6; i++) {
    float a = float(i) * 1.047198 + 0.3;
    float r = (i % 2 == 0) ? 0.9 : 2.1;
    vec2 q = p.xz + vec2(cos(a), sin(a) * uZ) * r;
    o += clamp((H(q) - p.y) / r, 0.0, 1.6);
  }
  return clamp(1.0 - o * 0.13, 0.28, 1.0);
}

void main() {
  vec3 p = vWorld;
  vec3 n = normalize(cross(dFdx(p), dFdy(p)));
  if (dot(n, uEye - p) < 0.0) n = -n;
  bool top = abs(vInfo.z - 2.0) > 0.5;
  if (top) n = normalize(mix(n, vec3(0.0, 1.0, 0.0), 0.15)); // dessus : un peu adouci
  vec3 po = p + n * 0.3;

  float ao = occlusion(po);
  float cloud = 0.62 + 0.5 * vnoise(vec2(p.x * 0.035 - uTime * 0.05, p.z / uZ * 0.05 + uTime * 0.015));

  float blob = 1.0;
  for (int i = 0; i < ${MAX_BLOBS}; i++) {
    vec4 b = uBlob[i];
    if (b.z <= 0.0) continue;
    vec2 d = (vec2(p.x, p.z / uZ) - b.xy) / b.zw;
    blob *= mix(0.42, 1.0, smoothstep(0.7, 1.05, dot(d, d)));
  }

  float ndl = dot(n, uMoonDir);
  float sm = ndl > 0.0 ? sunShadow(po, uMoonDir) : 0.0;
  vec3 light = uSkyCol * (0.55 + 0.45 * n.y) * ao * blob;
  light += uMoonCol * cloud * max(ndl, 0.0) * sm * blob;

  // Torche du héros.
  vec3 tl = uTorchPos - p;
  float td = length(tl);
  if (td < uTorchR) {
    float k = 1.0 - td / uTorchR;
    float w = 0.3 + 0.7 * max(dot(n, tl / td), 0.0);
    light += uTorchCol * (k * k) * w * pointShadow(po, uTorchPos, 10) * (0.55 + 0.45 * ao);
  }

  // Feux des villages et des camps.
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uNLights) break;
    vec3 lp = uLightPos[i].xyz;
    vec3 dl = lp - p;
    float d = length(dl);
    float r = uLightPos[i].w;
    if (d >= r) continue;
    float k = 1.0 - d / r;
    float w = 0.3 + 0.7 * max(dot(n, dl / d), 0.0);
    light += uLightCol[i] * (k * k) * w * pointShadow(po, lp, 7);
  }

  oLight = vec4(clamp(light * 0.5, 0.0, 1.0), clamp(n.y, 0.0, 1.0));

  // Glyphe "collé" à la surface : la grille suit l'objet, pas l'écran.
  vec2 fc;
  if (top) {
    fc = floor(vec2(p.x * 1.3, p.z * 0.95) * uFine);
  } else {
    float u = abs(n.x) > abs(n.z) ? p.z / uZ : p.x;
    fc = floor(vec2(u * 1.1, p.y * 0.55) * uFine) + vec2(31.0, 57.0);
  }
  float fine = floor(hash(fc) * 255.0);
  float tx = vInfo.x, ty = vInfo.y;
  float hiBits = floor(tx / 256.0) + 2.0 * floor(ty / 256.0) + 4.0 * vInfo.z;
  oTile = vec4(mod(tx, 256.0) / 255.0, mod(ty, 256.0) / 255.0, hiBits / 255.0, fine / 255.0);

  float depth = clamp(dot(p - uEye, uFwd) * uDepthScale, 0.0, 1.0) * 65535.0;
  float hi = floor(depth / 256.0);
  oGeo = vec4(hi / 255.0, (depth - hi * 256.0) / 255.0, dot(n, uRight) * 0.5 + 0.5, dot(n, uUp) * 0.5 + 0.5);
}
`;
