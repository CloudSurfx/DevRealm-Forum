// @ts-nocheck: custom WebGL shader for forum animated background
// "Creative Forge" theme — warm gold particles, cyan energy threads, deep indigo base
// Distinctive style for a maker/developer community forum

import { useEffect, useRef } from "react";

// Shader configuration - custom "forge" style with gold particles and cyan connections
const CONFIG = {
  style: 99, // Custom style ID
  seed: 1337,
  loop: 30, // 30 second loop
  cursor: 1, // Subtle mouse attraction
  p: {
    speed: 0.12,      // Slow, contemplative
    scale: 0.7,       // Slightly larger features
    warp: 0.25,       // Gentle distortion
    angle: 0,
    soft: 0.65,       // Soft edges
    detail: 3,        // Moderate detail
    bands: 0,
    flowX: 0.08,      // Very slow horizontal drift
    flowY: -0.05,     // Very slow vertical drift
    mstr: 0.2,        // Weak mouse influence
    grain: 0.1,       // Subtle film grain
    vig: 0.18,        // Gentle vignette
    pix: 1,
    post: 0,
    dither: 0,
    glow: 0.35,
    hue: 0,
    sat: 0.95,
    con: 1.08,
    bri: -0.01,
  },
};

export default function AnimatedBackground({ className = "", style = {} }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const colorsRef = useRef<[number, number, number][]>([]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    // Read current theme colors from CSS variables
    const getThemeColors = () => {
      const root = document.documentElement;
      const isDark = root.classList.contains('dark');

      // Primary accent color (gold)
      const accent = getComputedStyle(root).getPropertyValue('--forum-accent').trim() || '#fbbf24';
      const accentHover = getComputedStyle(root).getPropertyValue('--forum-accent-hover').trim() || '#fcd34d';
      // Secondary accent color (cyan)
      const accent2 = getComputedStyle(root).getPropertyValue('--forum-accent-2').trim() || '#06b6d4';

      // Parse hex to RGB (0-1 range)
      const hexToRgb = (hex: string) => {
        const h = hex.replace('#', '');
        return [
          parseInt(h.slice(0, 2), 16) / 255,
          parseInt(h.slice(2, 4), 16) / 255,
          parseInt(h.slice(4, 6), 16) / 255,
        ];
      };

      const c1 = hexToRgb(accent);       // Gold
      const c1Hover = hexToRgb(accentHover); // Lighter gold
      const c2 = hexToRgb(accent2);      // Cyan

      if (isDark) {
        // Dark mode: deep indigo base, gold, cyan, warm/cool glows
        return [
          [0.035, 0.03, 0.05],      // 0: Deep indigo base
          c1,                        // 1: Primary gold
          c2,                        // 2: Cyan
          [1.0, 0.65, 0.05],        // 3: Warm gold glow
          [0.0, 0.6, 0.7],          // 4: Cyan glow
          [0.08, 0.07, 0.12],       // 5: Mid indigo tone
          c1Hover,                   // 6: Light gold (for highlights)
        ];
      } else {
        // Light mode: warm cream base, gold, cyan, soft highlights
        return [
          [0.995, 0.985, 0.94],     // 0: Warm cream
          c1,                        // 1: Primary gold
          c2,                        // 2: Cyan
          [1.0, 0.85, 0.4],         // 3: Warm highlight
          [0.7, 0.9, 0.98],         // 4: Cool highlight
          [0.94, 0.92, 0.88],       // 5: Mid tone
          c1Hover,                   // 6: Light gold
        ];
      }
    };

    colorsRef.current = getThemeColors();

    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, preserveDrawingBuffer: false });
    if (!gl) {
      canvas.style.background = "linear-gradient(135deg, var(--forum-accent), var(--forum-accent-2))";
      return;
    }

    // Custom vertex shader - simple fullscreen quad
    const VERT = `
      attribute vec2 a_pos;
      varying vec2 v_uv;
      void main() {
        v_uv = a_pos * 0.5 + 0.5;
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }
    `;

    // Custom fragment shader - "Creative Forge" style
    // Features: gold particles (embers), cyan energy threads, subtle flow
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
      #define GOLD 1
      #define CYAN 2

      // Hash functions
      float hash(float p) { return fract(sin(p * 127.1) * 43758.5453); }
      float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec2 hash22(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
      vec3 hash33(vec3 p) { return fract(sin(vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.3, 271.9, 124.6)))) * 43758.5453); }

      // Value noise
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

      // FBM
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

      // Voronoi for cell centers
      vec2 voronoi(vec2 p, out float edgeDist) {
        vec2 n = floor(p);
        vec2 f = fract(p);
        float md = 8.0;
        float md2 = 8.0;
        vec2 mv = vec2(0.0);

        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash22(n + g);
            vec2 d = g + o - f;
            float dist = dot(d, d);
            if (dist < md) {
              md2 = md;
              md = dist;
              mv = o;
            } else if (dist < md2) {
              md2 = dist;
            }
          }
        }
        edgeDist = sqrt(md2) - sqrt(md);
        return mv;
      }

      // Smooth minimum
      float smin(float a, float b, float k) {
        float h = max(k - abs(a - b), 0.0) / k;
        return min(a, b) - h * h * h * k / 6.0;
      }

      // Color palette from uniforms
      vec3 palette(float t) {
        t = clamp(t, 0.0, 1.0);
        float n = 6.0;
        float f = t * (n - 1.0);
        vec3 col = u_colors[0];
        for (int i = 1; i < 7; i++) {
          float k = float(i);
          if (k < n) {
            float w = smoothstep(k - 0.5 - u_soft * 0.5, k - 0.5 + u_soft * 0.5, f);
            col = mix(col, u_colors[i], w);
          }
        }
        return col;
      }

      // Gold particle (ember)
      float ember(vec2 p, float t, float seed, out vec3 emberColor) {
        // Animated position with gentle rise and drift
        vec2 np = p;
        np.y -= t * 0.03; // Slow rise
        np.x += sin(t * 0.4 + seed * 13.7) * 0.08;
        np.y += cos(t * 0.3 + seed * 7.3) * 0.05;

        // Warp with noise
        float n = fbm(np * 1.2 + vec2(t * 0.02, -t * 0.01), int(u_detail));
        np += vec2(n, -n) * u_warp * 0.08;

        float d = length(np);
        // Soft glow with gold color
        float glow = exp(-d * d * 8.0) * 0.7;
        float core = exp(-d * d * 25.0);
        emberColor = u_colors[GOLD]; // Gold
        return glow + core * 0.4;
      }

      // Cyan energy thread
      float thread(vec2 p, vec2 a, vec2 b, float t) {
        vec2 ba = b - a;
        vec2 pa = p - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        vec2 closest = a + ba * h;
        float d = length(p - closest);

        // Animated pulse along thread
        float pulse = sin((h + t * 0.5) * TAU * 3.0) * 0.015;
        float w = 0.006 + abs(pulse) * 0.3;

        return exp(-d * d / (w * w)) * (0.4 + 0.6 * smoothstep(0.15, 0.85, h) * smoothstep(0.85, 0.15, h));
      }

      // Large scale flow field
      vec2 flowField(vec2 p, float t) {
        float n1 = fbm(p * 0.5 + vec2(t * 0.01, t * 0.015), 3);
        float n2 = fbm(p * 0.5 + vec2(t * 0.01, t * 0.015) + 100.0, 3);
        return vec2(sin(n1 * TAU), cos(n2 * TAU)) * 0.02;
      }

      void main() {
        vec2 fc = gl_FragCoord.xy;
        vec2 uv = fc / u_res;

        // Centered coordinates with aspect correction
        float mn = min(u_res.x, u_res.y);
        vec2 p = (fc - 0.5 * u_res) / mn;

        // Subtle mouse parallax
        if (u_mmode > 0) {
          vec2 m = (u_mouse - 0.5) * 2.0;
          vec2 d = p - m;
          float fall = exp(-dot(d, d) * 3.0) * u_mstr;
          p -= d * fall * 0.25;
        }

        // Scale and time
        p *= u_scale;
        float tt = u_time * u_speed;

        // Global flow
        p += u_flow * u_time * 0.03;
        p += flowField(p * 2.0, tt) * 0.5;

        // Seed offset
        p += vec2(u_seed * 0.01, u_seed * 0.02);

        // Base background color
        vec3 col = u_colors[0];

        // Ember layer — sparse gold particles rising
        vec2 emberGrid = floor(p * 2.5 + vec2(u_seed * 0.5, u_seed * 1.1));
        float emberLayer = 0.0;
        vec2 emberPos[12];
        float emberActive[12];
        float emberSeed[12];
        int emberCount = 0;

        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            if (emberCount >= 12) break;
            vec2 cell = emberGrid + vec2(float(i), float(j));
            float h = hash(cell.x + cell.y * 43.7);

            // Sparse embers
            if (h < 0.28) {
              vec2 center = (cell + hash22(cell) * 0.5) / 2.5;
              vec2 localP = p - center;
              vec3 emberCol;
              float e = ember(localP, tt, h, emberCol);
              if (e > 0.12) {
                emberPos[emberCount] = center;
                emberActive[emberCount] = e;
                emberSeed[emberCount] = h;
                emberCount++;
              }
              emberLayer += e;
            }
          }
        }

        // Cyan thread connections between nearby embers
        float threadLayer = 0.0;
        for (int i = 0; i < 12; i++) {
          if (i >= emberCount) break;
          for (int j = i + 1; j < 12; j++) {
            if (j >= emberCount) break;
            float d = distance(emberPos[i], emberPos[j]);
            // Connect nearby embers with cyan threads
            if (d < 0.55 && emberActive[i] > 0.18 && emberActive[j] > 0.18) {
              float t = thread(p, emberPos[i], emberPos[j], tt);
              threadLayer += t * 0.6;
            }
          }
        }

        // Subtle cyan field lines (energy grid)
        float fieldLayer = 0.0;
        vec2 fieldP = p * 1.5;
        float fieldN = fbm(fieldP + vec2(tt * 0.02, -tt * 0.01), 2);
        float fieldLines = abs(sin(fieldN * 8.0 + tt * 0.5)) * 0.5;
        fieldLayer = smoothstep(0.45, 0.55, fieldLines) * 0.15;

        // Combine layers
        float pattern = emberLayer * 0.7 + threadLayer * 0.5 + fieldLayer * 0.3;

        // Apply pattern to color — gold for embers, cyan for threads
        vec3 emberCol = u_colors[GOLD];
        vec3 threadCol = u_colors[CYAN];
        vec3 fieldCol = u_colors[CYAN];

        col = mix(col, emberCol, emberLayer * 0.5);
        col = mix(col, threadCol, threadLayer * 0.4);
        col = mix(col, fieldCol, fieldLayer * 0.3);

        // Large-scale atmospheric variation
        float largeScale = fbm(p * 0.25 + vec2(tt * 0.015, -tt * 0.008), 3);
        vec3 largeCol = palette(largeScale * 0.2 + 0.02);
        col = mix(col, largeCol, largeScale * 0.1);

        // Subtle vignette
        float vig = length(uv - 0.5);
        col *= mix(1.0, smoothstep(0.85, 0.25, vig), u_vig);

        // Film grain
        col += (hash22(fc + fract(u_time * 8.0)) - 0.5) * u_grain * 0.08;

        // Glow bloom on bright gold areas
        float goldLum = dot(col, vec3(0.3, 0.59, 0.11)); // Weighted for gold
        float bloom = smoothstep(0.6, 1.0, goldLum);
        col += bloom * bloom * u_glow * 0.12 * u_colors[GOLD];

        // Cyan edge glow
        float cyanLum = dot(col, vec3(0.0, 0.7, 0.3));
        float cyanBloom = smoothstep(0.5, 1.0, cyanLum);
        col += cyanBloom * cyanBloom * u_glow * 0.08 * u_colors[CYAN];

        // Saturation, contrast, brightness
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

    // Fullscreen quad
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(program, n);

    // Set static uniforms
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

    // Animation loop
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

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'data-theme')) {
          updateColors();
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    // Also listen for CSS variable changes via transitionend
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

      // Smooth mouse follow
      mouse[0] += (mouseTarget[0] - mouse[0]) * 0.06;
      mouse[1] += (mouseTarget[1] - mouse[1]) * 0.06;

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