import type { RGB } from '../render/color';
import type { World } from '../world/World';
import { Z_SCALE, type Relief } from '../world/relief';
import { Camera } from './Camera';
import { FACE_SEA, FLOATS_PER_VERTEX, buildChunk } from './mesh';
import { FRAGMENT, MAX_BLOBS, MAX_LIGHTS, VERTEX } from './shaders';

const CHUNK = 32;
/** Échantillons par case et par axe (2 → 4 échantillons par glyphe). */
export const SUPERSAMPLE = 2;

export interface SceneLight {
  /** Position en cases (x, y) et hauteur. */
  x: number;
  y: number;
  h: number;
  radius: number;
  color: RGB;
}

export interface FrameParams {
  time: number;
  torch: { x: number; y: number; h: number; intensity: number };
  lights: SceneLight[];
  /** Ombres de dragons : ellipses au sol (centre et demi-axes en cases). */
  blobs: { x: number; y: number; rx: number; ry: number }[];
}

/** G-buffer relu sur le CPU (lignes de haut en bas). */
export interface GBuffer {
  w: number;
  h: number;
  light: Uint8Array;
  tile: Uint8Array;
  geo: Uint8Array;
  /** Profondeur max encodée (pour décoder les 16 bits). */
  depthRange: number;
}

interface Slot {
  bufs: WebGLBuffer[];
  fence: WebGLSync | null;
  cam: Camera;
  /** Ordre d'émission, pour lire la plus récente image prête. */
  seq: number;
}

interface Chunk {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  count: number;
  dirty: boolean;
}

/**
 * Rendu 3D du monde (WebGL2) dans un G-buffer de la taille de la grille ASCII.
 * Rien n'est affiché directement : c'est le Composer qui choisit les glyphes.
 */
export class WorldRenderer {
  readonly gl: WebGL2RenderingContext;
  private readonly prog: WebGLProgram;
  private readonly uni: Record<string, WebGLUniformLocation | null> = {};
  private readonly chunks: Chunk[] = [];
  private readonly sea: { vao: WebGLVertexArrayObject; count: number };
  private readonly fieldTex: WebGLTexture;
  private fbo: WebGLFramebuffer | null = null;
  private targets: WebGLTexture[] = [];
  private depthRb: WebGLRenderbuffer | null = null;
  private gb: GBuffer = { w: 0, h: 0, light: new Uint8Array(0), tile: new Uint8Array(0), geo: new Uint8Array(0), depthRange: 1 };
  private raw = [new Uint8Array(0), new Uint8Array(0), new Uint8Array(0)];
  /**
   * Relecture asynchrone : un anneau de tampons (PBO) protégés par des fences.
   * On ne relit une image qu'une fois le GPU passé, sans jamais bloquer le pipeline ;
   * `viewCam` est la caméra de l'image actuellement dans le G-buffer.
   */
  private slots: Slot[] = [];
  readonly viewCam = new Camera();
  private hasView = false;
  private seq = 0;
  private readonly lightPos = new Float32Array(MAX_LIGHTS * 4);
  private readonly lightCol = new Float32Array(MAX_LIGHTS * 3);
  private readonly blob = new Float32Array(MAX_BLOBS * 4);

  constructor(
    private readonly world: World,
    private readonly relief: Relief,
  ) {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { antialias: false, depth: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL2 indisponible');
    this.gl = gl;
    this.prog = program(gl, VERTEX, FRAGMENT);
    for (const name of [
      'uViewProj', 'uField', 'uWorld', 'uZ', 'uMaxH', 'uEye', 'uFwd', 'uRight', 'uUp', 'uDepthScale', 'uTime', 'uFine',
      'uMoonDir', 'uMoonCol', 'uSkyCol', 'uTorchPos', 'uTorchCol', 'uTorchR', 'uNLights', 'uLightPos', 'uLightCol', 'uBlob',
    ]) {
      this.uni[name] = gl.getUniformLocation(this.prog, name);
    }

    this.fieldTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);
    // Demi-flottants : filtrables en WebGL2, le terrain s'interpole en une seule lecture.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, world.w, world.h, 0, gl.RG, gl.FLOAT, relief.shadowField);

    for (let y = 0; y < world.h; y += CHUNK) {
      for (let x = 0; x < world.w; x += CHUNK) {
        const vao = gl.createVertexArray()!;
        const vbo = gl.createBuffer()!;
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 12);
        const c: Chunk = { x0: x, y0: y, x1: Math.min(world.w, x + CHUNK), y1: Math.min(world.h, y + CHUNK), vao, vbo, count: 0, dirty: true };
        this.chunks.push(c);
      }
    }
    // Mer autour du monde, juste sous le niveau de l'eau : le monde passe devant.
    const M = 600;
    const y = -0.04;
    const Z = Z_SCALE;
    const q = [-M, -M, world.w + M, -M, world.w + M, world.h + M, -M, -M, world.w + M, world.h + M, -M, world.h + M];
    const seaData: number[] = [];
    for (let k = 0; k < q.length; k += 2) seaData.push(q[k], y, q[k + 1] * Z, 0, 0, FACE_SEA);
    const seaVao = gl.createVertexArray()!;
    gl.bindVertexArray(seaVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(seaData), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 12);
    this.sea = { vao: seaVao, count: 6 };
    gl.bindVertexArray(null);
  }

  /** Une case a changé : son bloc (et ses voisins en bordure) seront reconstruits. */
  tileChanged(x: number, y: number): void {
    for (const c of this.chunks) {
      if (x >= c.x0 - 1 && x <= c.x1 && y >= c.y0 - 1 && y <= c.y1) c.dirty = true;
    }
    const gl = this.gl;
    const x0 = Math.max(0, x - 1);
    const y0 = Math.max(0, y - 1);
    const x1 = Math.min(this.world.w, x + 2);
    const y1 = Math.min(this.world.h, y + 2);
    const w = x1 - x0;
    const sub = new Float32Array(w * (y1 - y0) * 2);
    for (let ty = y0; ty < y1; ty++) {
      sub.set(this.relief.shadowField.subarray((ty * this.world.w + x0) * 2, (ty * this.world.w + x1) * 2), (ty - y0) * w * 2);
    }
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x0, y0, w, y1 - y0, gl.RG, gl.FLOAT, sub);
  }

  /** Taille du G-buffer = grille ASCII × SUPERSAMPLE. */
  resize(cols: number, rows: number): void {
    const gl = this.gl;
    const w = cols * SUPERSAMPLE;
    const h = rows * SUPERSAMPLE;
    if (w === this.gb.w && h === this.gb.h) return;
    for (const t of this.targets) gl.deleteTexture(t);
    if (this.depthRb) gl.deleteRenderbuffer(this.depthRb);
    if (this.fbo) gl.deleteFramebuffer(this.fbo);

    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    this.targets = [0, 1, 2].map((k) => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + k, gl.TEXTURE_2D, t, 0);
      return t;
    });
    this.depthRb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthRb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthRb);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const n = w * h * 4;
    this.raw = [new Uint8Array(n), new Uint8Array(n), new Uint8Array(n)];
    for (const sl of this.slots) {
      for (const b of sl.bufs) gl.deleteBuffer(b);
      if (sl.fence) gl.deleteSync(sl.fence);
    }
    this.slots = [0, 1, 2].map(() => ({
      bufs: [0, 1, 2].map(() => {
        const b = gl.createBuffer()!;
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, b);
        gl.bufferData(gl.PIXEL_PACK_BUFFER, n, gl.STREAM_READ);
        return b;
      }),
      fence: null,
      cam: new Camera(),
      seq: 0,
    }));
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    this.hasView = false;
    this.gb = { w, h, light: new Uint8Array(n), tile: new Uint8Array(n), geo: new Uint8Array(n), depthRange: 1 };
  }

  /**
   * Dessine la scène vue par `cam` et rend le dernier G-buffer prêt (en général
   * celui d'une ou deux images plus tôt : on n'attend jamais le GPU). L'appelant
   * place ses sprites avec `viewCam`, la caméra de ce G-buffer.
   */
  render(cam: Camera, f: FrameParams): GBuffer {
    const gl = this.gl;
    const gb = this.gb;
    if (!gb.w || !this.fbo) return gb;

    // Blocs visibles : sol visible + marge (les sommets hauts du sud débordent vers le haut de l'écran).
    const lo = cam.groundBounds(cam.eye[1] - cam.dist * Math.sin(cam.pitch) - 2);
    const hi = cam.groundBounds(cam.eye[1] - cam.dist * Math.sin(cam.pitch) + 12);
    const bx0 = Math.min(lo.x0, hi.x0) - 4;
    const bx1 = Math.max(lo.x1, hi.x1) + 4;
    const by0 = Math.min(lo.y0, hi.y0) - 4;
    const by1 = Math.max(lo.y1, hi.y1) + 14;
    const visible = this.chunks.filter((c) => c.x1 > bx0 && c.x0 < bx1 && c.y1 > by0 && c.y0 < by1);
    for (const c of visible) if (c.dirty) this.rebuild(c);
    // Du plus proche au plus lointain : la caméra regarde vers le nord.
    visible.sort((a, b) => b.y0 - a.y0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, gb.w, gb.h);
    gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
    gl.clearBufferfv(gl.COLOR, 1, [0, 0, 0, 0]);
    gl.clearBufferfv(gl.COLOR, 2, [1, 1, 0.5, 0.5]);
    gl.clearBufferfv(gl.DEPTH, 0, [1]);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(this.prog);

    const u = this.uni;
    gl.uniformMatrix4fv(u.uViewProj, false, cam.viewProj);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);
    gl.uniform1i(u.uField, 0);
    gl.uniform2f(u.uWorld, this.world.w, this.world.h);
    gl.uniform1f(u.uZ, Z_SCALE);
    gl.uniform1f(u.uMaxH, this.relief.maxHeight + 1);
    gl.uniform3fv(u.uEye, cam.eye);
    gl.uniform3fv(u.uFwd, cam.fwd);
    gl.uniform3fv(u.uRight, cam.right);
    gl.uniform3fv(u.uUp, cam.up);
    gb.depthRange = cam.far;
    gl.uniform1f(u.uDepthScale, 1 / cam.far);
    gl.uniform1f(u.uTime, f.time);
    // De près, une case couvre plusieurs glyphes : le grain s'affine pour qu'ils varient.
    gl.uniform1f(u.uFine, Math.max(1, cam.colsPerTile * 0.75));
    // Lune basse à l'ouest, un peu derrière la caméra : les façades sud prennent la lumière,
    // les ombres s'allongent vers le nord-est, donc vers le haut de l'écran.
    const md = norm3(-0.62, 0.62, 0.36);
    gl.uniform3f(u.uMoonDir, md[0], md[1], md[2]);
    gl.uniform3f(u.uMoonCol, 0.58, 0.66, 0.95);
    gl.uniform3f(u.uSkyCol, 0.12, 0.14, 0.22);
    const t = f.torch;
    gl.uniform3f(u.uTorchPos, t.x, t.h, t.y * Z_SCALE);
    gl.uniform3f(u.uTorchCol, 1.45 * t.intensity, 0.98 * t.intensity, 0.55 * t.intensity);
    gl.uniform1f(u.uTorchR, 20);

    const lights = f.lights.slice(0, MAX_LIGHTS);
    this.lightPos.fill(0);
    this.lightCol.fill(0);
    lights.forEach((l, i) => {
      this.lightPos.set([l.x, l.h, l.y * Z_SCALE, l.radius * 1.25], i * 4);
      this.lightCol.set([(l.color[0] / 255) * 1.5, (l.color[1] / 255) * 1.5, (l.color[2] / 255) * 1.5], i * 3);
    });
    gl.uniform1i(u.uNLights, lights.length);
    gl.uniform4fv(u.uLightPos, this.lightPos);
    gl.uniform3fv(u.uLightCol, this.lightCol);
    this.blob.fill(0);
    f.blobs.slice(0, MAX_BLOBS).forEach((b, i) => this.blob.set([b.x, b.y, b.rx, b.ry], i * 4));
    gl.uniform4fv(u.uBlob, this.blob);

    for (const c of visible) {
      if (!c.count) continue;
      gl.bindVertexArray(c.vao);
      gl.drawArrays(gl.TRIANGLES, 0, c.count);
    }
    gl.bindVertexArray(this.sea.vao);
    gl.drawArrays(gl.TRIANGLES, 0, this.sea.count);
    gl.bindVertexArray(null);

    // 1. Les images prêtes : on garde la plus récente, les plus anciennes sont libérées.
    let ready: Slot | null = null;
    for (const sl of this.slots) {
      if (!sl.fence) continue;
      if (gl.getSyncParameter(sl.fence, gl.SYNC_STATUS) !== gl.SIGNALED) continue;
      if (!ready || sl.seq > ready.seq) ready = sl;
    }
    // 2. Un emplacement libre pour cette image ; sinon on force la plus ancienne.
    let free = this.slots.find((sl) => !sl.fence && sl !== ready);
    if (!free) {
      const oldest = this.slots.filter((sl) => sl !== ready).sort((a, b) => a.seq - b.seq)[0];
      gl.clientWaitSync(oldest.fence!, 0, 0);
      if (!ready || oldest.seq > ready.seq) ready = oldest;
      free = this.slots.find((sl) => sl !== ready)!;
    }
    if (ready) {
      const outs = [gb.light, gb.tile, gb.geo];
      for (let k = 0; k < 3; k++) {
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, ready.bufs[k]);
        gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this.raw[k]);
        flipRows(this.raw[k], outs[k], gb.w, gb.h);
      }
      this.viewCam.copyFrom(ready.cam);
      this.hasView = true;
      for (const sl of this.slots) {
        if (sl.fence && sl.seq <= ready.seq) {
          gl.deleteSync(sl.fence);
          sl.fence = null;
        }
      }
    }
    // 3. Copie asynchrone de cette image dans l'emplacement libre.
    if (free.fence) {
      gl.deleteSync(free.fence);
      free.fence = null;
    }
    for (let k = 0; k < 3; k++) {
      gl.readBuffer(gl.COLOR_ATTACHMENT0 + k);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, free.bufs[k]);
      gl.readPixels(0, 0, gb.w, gb.h, gl.RGBA, gl.UNSIGNED_BYTE, 0);
    }
    free.fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    free.cam.copyFrom(cam);
    free.seq = ++this.seq;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.flush();
    if (!this.hasView) this.viewCam.copyFrom(cam);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    return gb;
  }

  dispose(): void {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  private rebuild(c: Chunk): void {
    const gl = this.gl;
    const data = buildChunk(this.world, this.relief, c.x0, c.y0, c.x1, c.y1);
    gl.bindBuffer(gl.ARRAY_BUFFER, c.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    c.count = data.length / FLOATS_PER_VERTEX;
    c.dirty = false;
  }
}

function flipRows(src: Uint8Array, dst: Uint8Array, w: number, h: number): void {
  const row = w * 4;
  for (let y = 0; y < h; y++) dst.set(src.subarray((h - 1 - y) * row, (h - y) * row), y * row);
}

function norm3(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

function shader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`Shader : ${gl.getShaderInfoLog(s)}`);
  return s;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`Programme : ${gl.getProgramInfoLog(p)}`);
  return p;
}
