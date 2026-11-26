// @ts-nocheck: custom WebGL shader for forum animated background v2
// "Midnight Grid" theme — subtle grid lines, soft atmospheric glow, gentle particle drift
// Clean, techy aesthetic for a developer community forum

import { useEffect, useRef } from "react";

// Shader configuration - "Midnight Grid" style
const CONFIG = {
  style: 88,
  seed: 4242,
  loop: 60,
  cursor: 1,
  p: {
    speed: 0.08,
    scale: 1.0,
    warp: 0.15,
    angle: 0,
    soft: 0.8,
    detail: 2,
    bands: 0,
    flowX: 0.02,
    flowY: -0.01,
    mstr: 0.15,
    grain: 0.05,
    vig: 0.25,
    pix: 1,
    post: 0,
    dither: 0,
    glow: 0.2,
    hue: 0,
    sat: 0.6,
    con: 1.05,
    bri: -0.02,
  },
};

export default function AnimatedBackgroundV2({ className = "", style = {} }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const colorsRef = useRef<[number, number, number][]>([]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const getThemeColors = () => {
      const root = document.documentElement;
      const isDark = root.classList.contains('dark');

      const accent = getComputedStyle(root).getPropertyValue('--forum-accent').trim() || '#fbbf24';
      const accentHover = getComputedStyle(root).getPropertyValue('--forum-accent-hover').trim() || '#fcd34d';
      const accent2 = getComputedStyle(root).getPropertyValue('--forum-accent-2').trim() || '#06b6d4';

      const hexToRgb = (hex: string) => {
        const h = hex.replace('#', '');
        return [
          parseInt(h.slice(0, 2), 16) / 255,
          parseInt(h.slice(2, 4), 16) / 255,
          parseInt(h.slice(4, 6), 16) / 255,
        ];
      };

      const c1 = hexToRgb(accent);
      const c1Hover = hexToRgb(accentHover);
      const c2 = hexToRgb(accent2);

      if (isDark) {
        return [
          [0.02, 0.02, 0.035],
          c1,
          c2,
          [1.0, 0.7, 0.1],
          [0.0, 0.5, 0.6],
          [0.04, 0.04, 0.07],
          c1Hover,
        ];
      } else {
        return [
          [0.985, 0.985, 0.99],
          c1,
          c2,
          [1.0, 0.9, 0.3],
          [0.6, 0.85, 0.95],
          [0.94, 0.94, 0.96],
          c1Hover,
        ];
      }
    };

    colorsRef.current = getThemeColors();

    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, preserveDrawingBuffer: false });
    if (!gl) {
      canvas.style.background = "linear-gradient(135deg, var(--forum-accent), var(--forum-accent-2))";
      return;
    }

    const VERT = `
      attribute vec2 a_pos;
      varying vec2 v_uv;
      void main() {
        v_uv = a_pos * 0.5 + 0.5;
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }
    `;

    const FRAG = `
      precision highp float;
      varying vec2 v_uv;

      uniform vec2 u_res;
      uniform float u_time;
      uniform vec3 u_colors[7];
      uniform float u_seed;
      uniform float u_speed;
      uniform float u_scale;
      uniform float u_warp;
      uniform float u_soft;
      uniform float u_detail;
      uniform vec2 u_flow;
      uniform vec2 u_mouse;
      uniform float u_mstr;
      uniform int u_mmode;
      uniform float u_grain;
      uniform float u_vig;
      uniform float u_glow;
      uniform float u_sat;
      uniform float u_con;
      uniform float u_bri;

      #define TAU 6.28318530718
      #define ROT2(a) mat2(cos(a), -sin(a), sin(a), cos(a))

      float hash(float p) { return fract(sin(p * 127.1) * 43758.5453); }
      float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec2 hash22(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash2(i);
        float b = hash2(i + vec2(1.0, 0.0));
        float c = hash2(i + vec2(0.0, 1.0));
        float d = hash2(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p, int octaves) {
        float v = 0.0;
        float a = 0.5;
        vec2 cp = p;
        for (int i = 0; i < 6; i++) {
          if (i >= octaves) break;
          v += a * noise(cp);
          cp = cp * 2.02 + 11.3;
          a *= 0.5;
        }
        return v;
      }

      float grid(vec2 p, float thickness) {
        vec2 g = abs(fract(p - 0.5) - 0.5);
        return 1.0 - smoothstep(0.0, thickness, min(g.x, g.y));
      }

      float atmosphere(vec2 p, float t) {
        float n = fbm(p * 0.3 + vec2(t * 0.01, -t * 0.005), 3);
        return smoothstep(0.4, 0.6, n) * 0.15;
      }

      // Particle at a specific cell - returns vec4 (value, color)
      vec4 particle(vec2 p, vec2 cell, float h, float tt) {
        vec2 center = (cell + hash22(cell) * 0.6) / 1.8;
        vec2 localP = p - center;
        localP.x += sin(tt * 0.15 + h * 17.0) * 0.15;
        localP.y += cos(tt * 0.12 + h * 11.0) * 0.1;
        float d = length(localP);
        float pGl = exp(-d * d * 3.0) * 0.4;
        float pCore = exp(-d * d * 12.0) * 0.6;
        float val = (pGl + pCore) * 0.3;
        vec3 pColor = (hash(h * 100.0) < 0.5) ? u_colors[1] : u_colors[2];
        return vec4(pColor, val);
      }

      void main() {
        vec2 fc = gl_FragCoord.xy;
        vec2 uv = fc / u_res;

        float mn = min(u_res.x, u_res.y);
        vec2 p = (fc - 0.5 * u_res) / mn;

        if (u_mmode > 0) {
          vec2 m = (u_mouse - 0.5) * 2.0;
          vec2 d = p - m;
          float fall = exp(-dot(d, d) * 2.0) * u_mstr;
          p -= d * fall * 0.15;
        }

        p *= u_scale;
        float tt = u_time * u_speed;
        p += u_flow * u_time * 0.02;
        p += vec2(u_seed * 0.01, u_seed * 0.02);

        vec3 col = u_colors[0];

        // === GRID LAYER ===
        vec2 gridP = p * 3.0;
        float gridAngle = tt * 0.02;
        gridP = ROT2(gridAngle) * gridP;
        float gridLines = grid(gridP, 0.003);
        col = mix(col, u_colors[1], gridLines * 0.04);

        vec2 gridP2 = p * 1.5;
        float gridAngle2 = -tt * 0.015;
        gridP2 = ROT2(gridAngle2) * gridP2;
        float gridLines2 = grid(gridP2, 0.002);
        col = mix(col, u_colors[2], gridLines2 * 0.025);

        // === ATMOSPHERIC GLOW ===
        float atmo = atmosphere(p, tt);
        vec3 atmoColor = mix(u_colors[3], u_colors[4], 0.5);
        col = mix(col, atmoColor, atmo);

        // === PARTICLE LAYER (unrolled loops) ===
        vec2 particleGrid = floor(p * 1.8 + vec2(u_seed * 0.7, u_seed * 1.3));
        float particleLayer = 0.0;

        // Manually unroll the 3x3 grid
        // Cell (-1, -1)
        {
          vec2 cell = particleGrid + vec2(-1.0, -1.0);
          float h = hash(cell.x + cell.y * 43.7);
          if (h < 0.08) {
            vec4 result = particle(p, cell, h, tt);
            particleLayer += result.w;
            col = mix(col, result.xyz, result.w * 0.15);
          }
        }
        // Cell (0, -1)
        {
          vec2 cell = particleGrid + vec2(0.0, -1.0);
          float h = hash(cell.x + cell.y * 43.7);
          if (h < 0.08) {
            vec3 pColor;
            float v = particle(p, cell, h, tt, pColor);
            particleLayer += v;
            col = mix(col, pColor, v * 0.15);
          }
        }
        // Cell (1, -1)
        {
          vec2 cell = particleGrid + vec2(1.0, -1.0);
          float h = hash(cell.x + cell.y * 43.7);
          if (h < 0.08) {
            vec3 pColor;
            float v = particle(p, cell, h, tt, pColor);
            particleLayer += v;
            col = mix(col, pColor, v * 0.15);
          }
        }
        // Cell (-1, 0)
        {
          vec2 cell = particleGrid + vec2(-1.0, 0.0);
          float h = hash(cell.x + cell.y * 43.7);
          if (h < 0.08) {
            vec3 pColor;
            float v = particle(p, cell, h, tt, pColor);
            particleLayer += v;
            col = mix(col, pColor, v * 0.15);
          }
        }
        // Cell (0, 0)
        {
          vec2 cell = particleGrid + vec2(0.0, 0.0);
          float h = hash(cell.x + cell.y * 43.7);
          if (h < 0.08) {
            vec3 pColor;
            float v = particle(p, cell, h, tt, pColor);
            particleLayer += v;
            col = mix(col, pColor, v * 0.15);
          }
        }
        // Cell (1, 0)
        {
          vec2 cell = particleGrid + vec2(1.0, 0.0);
          float h = hash(cell.x + cell.y * 43.7);
          if (h < 0.08) {
            vec3 pColor;
            float v = particle(p, cell, h, tt, pColor);
            particleLayer += v;
            col = mix(col, pColor, v * 0.15);
          }
        }
        // Cell (-1, 1)
        {
          vec2 cell = particleGrid + vec2(-1.0, 1.0);
          float h = hash(cell.x + cell.y * 43.7);
          if (h < 0.08) {
            vec3 pColor;
            float v = particle(p, cell, h, tt, pColor);
            particleLayer += v;
            col = mix(col, pColor, v * 0.15);
          }
        }
        // Cell (0, 1)
        {
          vec2 cell = particleGrid + vec2(0.0, 1.0);
          float h = hash(cell.x + cell.y * 43.7);
          if (h < 0.08) {
            vec3 pColor;
            float v = particle(p, cell, h, tt, pColor);
            particleLayer += v;
            col = mix(col, pColor, v * 0.15);
          }
        }
        // Cell (1, 1)
        {
          vec2 cell = particleGrid + vec2(1.0, 1.0);
          float h = hash(cell.x + cell.y * 43.7);
          if (h < 0.08) {
            vec3 pColor;
            float v = particle(p, cell, h, tt, pColor);
            particleLayer += v;
            col = mix(col, pColor, v * 0.15);
          }
        }

        // === SUBTLE VIGNETTE ===
        float vig = length(uv - 0.5);
        col *= mix(1.0, smoothstep(0.9, 0.2, vig), u_vig);

        // === MINIMAL FILM GRAIN ===
        col += (hash22(fc + fract(u_time * 4.0)) - 0.5) * u_grain * 0.04;

        // === GENTLE GLOW BLOOM ===
        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        float bloom = smoothstep(0.7, 1.0, lum);
        col += bloom * bloom * u_glow * 0.06 * u_colors[1];

        // === SATURATION, CONTRAST, BRIGHTNESS ===
        float L = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(L), col, u_sat);
        col = (col - 0.5) * u_con + 0.5 + u_bri;

        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `;

    const createShader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(s));
      }
      return s;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(program, n);

    gl.uniform1f(u("u_seed"), CONFIG.seed * 3.17);
    gl.uniform1f(u("u_speed"), CONFIG.p.speed);
    gl.uniform1f(u("u_scale"), CONFIG.p.scale);
    gl.uniform1f(u("u_warp"), CONFIG.p.warp);
    gl.uniform1f(u("u_soft"), CONFIG.p.soft);
    gl.uniform1f(u("u_detail"), CONFIG.p.detail);
    gl.uniform2f(u("u_flow"), CONFIG.p.flowX, CONFIG.p.flowY);
    gl.uniform1f(u("u_mstr"), CONFIG.p.mstr);
    gl.uniform1i(u("u_mmode"), CONFIG.cursor);
    gl.uniform1f(u("u_grain"), CONFIG.p.grain);
    gl.uniform1f(u("u_vig"), CONFIG.p.vig);
    gl.uniform1f(u("u_glow"), CONFIG.p.glow);
    gl.uniform1f(u("u_sat"), CONFIG.p.sat);
    gl.uniform1f(u("u_con"), CONFIG.p.con);
    gl.uniform1f(u("u_bri"), CONFIG.p.bri);

    let t = 0;
    let last = performance.now();
    const ur = u("u_res");
    const ut = u("u_time");
    const um = u("u_mouse");
    const uc = u("u_colors");
    let mouse = [0.5, 0.5];
    let mouseTarget = [0.5, 0.5];
    let rafId = 0;
    let isVisible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const updateColors = () => {
      colorsRef.current = getThemeColors();
      gl.uniform3fv(uc, colorsRef.current.flat());
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'data-theme')) {
          updateColors();
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    document.documentElement.addEventListener('transitionend', (e) => {
      if (e.propertyName.includes('--forum-accent') || e.propertyName.includes('--forum-accent-2')) {
        updateColors();
      }
    });

    const pointerMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseTarget[0] = (e.clientX - r.left) / r.width;
      mouseTarget[1] = 1 - (e.clientY - r.top) / r.height;
    };
    window.addEventListener('pointermove', pointerMove);

    const handleVisibility = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (isVisible && CONFIG.loop > 0) {
        t += dt;
        t = t % CONFIG.loop;
      } else if (isVisible) {
        t += dt * CONFIG.p.speed;
      }

      mouse[0] += (mouseTarget[0] - mouse[0]) * 0.04;
      mouse[1] += (mouseTarget[1] - mouse[1]) * 0.04;

      resize();
      gl.uniform2f(ur, canvas.width, canvas.height);
      gl.uniform1f(ut, t);
      gl.uniform2f(um, mouse[0], mouse[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      rafId = requestAnimationFrame(frame);
    };

    updateColors();
    resize();
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', pointerMove);
      document.removeEventListener('visibilitychange', handleVisibility);
      observer.disconnect();
      gl.deleteProgram(program);
      gl.deleteBuffer(buf);
    };
  }, []);

  return <canvas ref={ref} className={className} style={{ display: "block", width: "100%", height: "100%", ...style }} aria-hidden="true" />;
}