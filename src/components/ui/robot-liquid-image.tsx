import { useCallback, useEffect, useRef, useState } from 'react';

type Hotspot = {
  x: number;
  y: number;
};

type LiquidImageProps = {
  image: { src: string; alt?: string };
  strength?: number;
  speed?: number;
  hotspots?: Hotspot[];
  borderRadius?: number;
  className?: string;
  style?: React.CSSProperties;
};

export function RobotLiquidImage({
  image,
  strength = 0.03,
  speed = 0.14,
  hotspots = [],
  borderRadius = 0,
  className,
  style
}: LiquidImageProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ width: 400, height: 300 });
  const dprRef = useRef(1);

  const mouseRef = useRef({ x: -10, y: -10, active: false });
  const maskRadiusRef = useRef(0);
  const wakeRef = useRef<Array<{ x: number; y: number; t: number }>>([]);
  const hotspotsRef = useRef(hotspots);
  const hoveredRef = useRef(false);

  useEffect(() => {
    hotspotsRef.current = hotspots;
  }, [hotspots]);

  useEffect(() => {
    const resize = () => {
      if (!wrapperRef.current) return;
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      dprRef.current = dpr;
      const rect = wrapperRef.current.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      setSize(current => (current.width === w && current.height === h ? current : { width: w, height: h }));
    };

    resize();
    const raf = window.requestAnimationFrame(resize);
    const observer =
      typeof ResizeObserver !== 'undefined' && wrapperRef.current
        ? new ResizeObserver(() => resize())
        : null;
    if (observer && wrapperRef.current) observer.observe(wrapperRef.current);
    window.addEventListener('resize', resize);

    return () => {
      window.cancelAnimationFrame(raf);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let x = 0;
    let y = 0;

    if ('touches' in event && event.touches.length > 0) {
      x = (event.touches[0].clientX - rect.left) / rect.width;
      y = (event.touches[0].clientY - rect.top) / rect.height;
    } else if ('clientX' in event) {
      x = (event.clientX - rect.left) / rect.width;
      y = (event.clientY - rect.top) / rect.height;
    }

    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    mouseRef.current = { x, y, active: true };
    hoveredRef.current = true;

    const now = Date.now();
    wakeRef.current = [...wakeRef.current.filter(w => now - w.t < 1200), { x, y, t: now }].slice(-8);
  }, []);

  const handleLeave = useCallback(() => {
    mouseRef.current = { ...mouseRef.current, active: false };
    hoveredRef.current = false;
  }, []);

  useEffect(() => {
    let animationId = 0;
    let lastHovered = false;
    let start: number | null = null;
    let from = 0;
    let to = 0;
    const duration = 650;

    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const animate = (ts: number) => {
      const hovered = hoveredRef.current;
      if (hovered !== lastHovered) {
        lastHovered = hovered;
        start = ts;
        from = maskRadiusRef.current;
        to = hovered ? 1.5 : 0;
      }

      if (start === null) start = ts;
      const elapsed = Math.min((ts - start) / duration, 1);
      maskRadiusRef.current = from + (to - from) * easeInOutCubic(elapsed);
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const dpr = dprRef.current || 1;
    canvasRef.current.width = size.width;
    canvasRef.current.height = size.height;
    canvasRef.current.style.width = '100%';
    canvasRef.current.style.height = '100%';

    let gl = canvasRef.current.getContext('webgl');
    if (!gl) return;

    let animationId = 0;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = image.src;

    let tex: WebGLTexture | null = null;
    let program: WebGLProgram | null = null;
    let uTime: WebGLUniformLocation | null = null;
    let uMouse: WebGLUniformLocation | null = null;
    let uStrength: WebGLUniformLocation | null = null;
    let uSpeed: WebGLUniformLocation | null = null;
    let uResolution: WebGLUniformLocation | null = null;
    let uWake: WebGLUniformLocation | null = null;
    let uWakeCount: WebGLUniformLocation | null = null;
    let uMaskRadius: WebGLUniformLocation | null = null;
    let loaded = false;
    const startTime = Date.now();

    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0, 1);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      varying vec2 v_uv;
      uniform sampler2D u_image;
      uniform vec2 u_mouse;
      uniform float u_time;
      uniform float u_strength;
      uniform float u_speed;
      uniform vec2 u_resolution;
      #define MAX_WAKE 16
      uniform int u_wakeCount;
      uniform vec3 u_wake[MAX_WAKE];
      uniform float u_maskRadius;

      void main() {
        vec2 uv = v_uv;

        for (int i = 0; i < MAX_WAKE; ++i) {
          if (i >= u_wakeCount) break;
          vec2 w = u_wake[i].xy;
          float t = u_time - u_wake[i].z;
          float dist = distance(uv, w);
          float amp = exp(-dist * 16.0) * exp(-t * 1.2);
          float ripple = sin(32.0 * dist - t * 8.0 * u_speed) * 0.04;
          uv += normalize(uv - w) * ripple * u_strength * amp * 2.0;
        }

        if (u_mouse.x >= 0.0 && u_mouse.x <= 1.0 && u_mouse.y >= 0.0 && u_mouse.y <= 1.0) {
          float dist = distance(uv, u_mouse);
          float ripple = sin(32.0 * dist - u_time * 8.0 * u_speed) * 0.04;
          float effect = exp(-dist * 12.0);
          uv += normalize(uv - u_mouse) * ripple * u_strength * effect * 2.0;
        }

        uv = clamp(uv, 0.0, 1.0);
        vec4 color = texture2D(u_image, uv);

        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        vec3 grayColor = vec3(gray);

        float mask = 0.0;
        float maskRadius = u_maskRadius;

        if (u_mouse.x >= 0.0 && u_mouse.x <= 1.0 && u_mouse.y >= 0.0 && u_mouse.y <= 1.0 && maskRadius > 0.0) {
          float d = distance(uv, u_mouse);
          mask = max(mask, smoothstep(maskRadius, maskRadius * 0.8, d));
        }

        for (int i = 0; i < MAX_WAKE; ++i) {
          if (i >= u_wakeCount) break;
          vec2 w = u_wake[i].xy;
          float d = distance(uv, w);
          mask = max(mask, smoothstep(maskRadius, maskRadius * 0.8, d));
        }

        vec3 finalColor = mix(grayColor, color.rgb, mask);
        gl_FragColor = vec4(finalColor, color.a);
      }
    `;

    const createShader = (type: number, src: string) => {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, src);
      gl!.compileShader(shader);
      return shader;
    };

    const createProgram = (vs: WebGLShader, fs: WebGLShader) => {
      const p = gl!.createProgram()!;
      gl!.attachShader(p, vs);
      gl!.attachShader(p, fs);
      gl!.linkProgram(p);
      return p;
    };

    const setup = () => {
      const vShader = createShader(gl!.VERTEX_SHADER, vertexShaderSource);
      const fShader = createShader(gl!.FRAGMENT_SHADER, fragmentShaderSource);
      program = createProgram(vShader, fShader);
      gl!.useProgram(program);

      const pos = gl!.createBuffer();
      gl!.bindBuffer(gl!.ARRAY_BUFFER, pos);
      gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl!.STATIC_DRAW);
      const loc = gl!.getAttribLocation(program, 'a_position');
      gl!.enableVertexAttribArray(loc);
      gl!.vertexAttribPointer(loc, 2, gl!.FLOAT, false, 0, 0);

      uTime = gl!.getUniformLocation(program, 'u_time');
      uMouse = gl!.getUniformLocation(program, 'u_mouse');
      uStrength = gl!.getUniformLocation(program, 'u_strength');
      uSpeed = gl!.getUniformLocation(program, 'u_speed');
      uResolution = gl!.getUniformLocation(program, 'u_resolution');
      uWake = gl!.getUniformLocation(program, 'u_wake');
      uWakeCount = gl!.getUniformLocation(program, 'u_wakeCount');
      uMaskRadius = gl!.getUniformLocation(program, 'u_maskRadius');

      tex = gl!.createTexture();
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, 1);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, img);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.uniform1i(gl!.getUniformLocation(program, 'u_image'), 0);
      loaded = true;
    };

    img.onload = () => {
      setup();
      updateTexture();
      render();
    };

    const updateTexture = () => {
      if (!tex) return;
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, 1);

      const offW = size.width;
      const offH = size.height;
      const offCanvas = document.createElement('canvas');
      offCanvas.width = offW;
      offCanvas.height = offH;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) return;

      const iw = img.width;
      const ih = img.height;
      const scale = Math.max(offW / iw, offH / ih);
      const sw = iw * scale;
      const sh = ih * scale;
      const sx = (offW - sw) / 2;
      const sy = (offH - sh) / 2;
      ctx.clearRect(0, 0, offW, offH);
      ctx.drawImage(img, sx, sy, sw, sh);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, offCanvas);
    };

    const render = () => {
      if (!loaded || !gl) return;

      gl.viewport(0, 0, size.width, size.height);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const now = (Date.now() - startTime) / 1000;
      gl.uniform1f(uTime, now);

      let mx = mouseRef.current.active ? Math.max(0, Math.min(1, mouseRef.current.x)) : -10;
      let my = mouseRef.current.active ? Math.max(0, Math.min(1, mouseRef.current.y)) : -10;
      my = 1 - my;

      gl.uniform2f(uMouse, mx, my);
      gl.uniform1f(uStrength, strength * 2.5);
      gl.uniform1f(uSpeed, speed);
      gl.uniform2f(uResolution, size.width, size.height);

      const nowMs = Date.now();
      const wakeArr = wakeRef.current.slice(-8);
      const hotspotArr = (hotspotsRef.current || []).slice(0, 8).map(h => ({ x: h.x, y: h.y, t: nowMs - 100000 }));
      const allWake = [...wakeArr, ...hotspotArr].slice(-16);
      const wakeData = new Float32Array(16 * 3);

      let count = 0;
      for (let i = 0; i < allWake.length; i++) {
        const w = allWake[i];
        wakeData[i * 3 + 0] = w.x;
        wakeData[i * 3 + 1] = 1 - w.y;
        wakeData[i * 3 + 2] = (w.t - startTime) / 1000;
        count++;
      }

      gl.uniform1i(uWakeCount, count);
      gl.uniform3fv(uWake, wakeData);
      gl.uniform1f(uMaskRadius, maskRadiusRef.current);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationId = requestAnimationFrame(render);
    };

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      gl = null;
    };
  }, [image.src, size.width, size.height, strength, speed]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        ...style,
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius
      }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onTouchMove={handleMove}
      onTouchEnd={handleLeave}
    >
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        style={{ width: '100%', height: '100%', display: 'block', borderRadius }}
        aria-label={image.alt ?? 'Liquid background'}
      />
    </div>
  );
}
