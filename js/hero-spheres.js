// Hero background: three red spheres drawn live with WebGL2 (no libraries).
// Rebuilt from the old hero video (1600x900, 16 s boomerang loop): the
// sphere paths below were tracked from it every 0.5 s.
//
// Look: each sphere has a thin rim line with a near-white core, a glow just
// inside the lit side of the rim, and (per sphere) a broad lit cap or a soft
// haze band. Spheres are see-through: every rim stays visible across an
// overlap, the fills drop out there, and the overlap ("lens") gets its own
// tight glow along its edges.
//
// Fallbacks: without WebGL2 the canvas stays empty and the poster image set
// on .hero__video shows through. With prefers-reduced-motion, one still frame.
(function () {
  'use strict';
  const canvas = document.querySelector('.hero__video canvas');
  if (!canvas) return;
  const gl = canvas.getContext('webgl2', { antialias: false });
  if (!gl) return;

  // ---------- shaders ----------
  const VS = `#version 300 es
  in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;
  // Units: "video pixels" of the 1600x900 source, origin at the frame center,
  // y up. u_scale = device px per video px (cover fit, like object-fit: cover).
  const FS = `#version 300 es
  precision highp float;
  uniform vec2 u_res;
  uniform float u_scale;
  uniform vec3 u_s[3];   // center x, y, radius (video px)
  uniform vec2 u_L[3];   // light direction per sphere (unit)
  out vec4 o;
  // per sphere: 0 top, 1 middle, 2 bottom (measured from the video)
  const float EDGE[3] = float[3](1., .25, .45);   // glow just inside the rim, lit side
  const float CAP[3]  = float[3](0., 0., .6);     // broad lit cap (bottom sphere)
  const float HAZE[3] = float[3](0., .3, 0.);     // soft band under the top of the middle sphere
  void main(){
    vec2 p = (gl_FragCoord.xy - .5 * u_res) / u_scale;
    float sd[3], ins[3], lit[3];
    vec2 q[3];
    float I = 0.;
    for (int i = 0; i < 3; i++) {
      vec2 c = u_s[i].xy; float r = u_s[i].z;
      q[i] = (p - c) / r;
      float d = length(q[i]);
      vec2 n = q[i] / max(d, 1e-4);
      sd[i] = (d - 1.) * r;                                  // signed distance to the rim, video px
      ins[i] = 1. - smoothstep(-.7, .7, sd[i] * u_scale);    // inside mask, 1 device px soft
      float l = .5 + .5 * dot(n, u_L[i]); lit[i] = l * l;    // rim light falls off around the circle
    }
    for (int i = 0; i < 3; i++) {
      // rim line, ~3 video px wide, never hidden by another sphere; inside
      // another sphere it lights up even on its dark side (the lens edge)
      float inOther = 0.;
      for (int j = 0; j < 3; j++) if (j != i) inOther = max(inOther, ins[j]);
      I += 1.5 * max(lit[i], .85 * inOther) * exp(-pow(sd[i] / 1.6, 2.));
    }
    for (int i = 0; i < 3; i++) {
      // fills vanish where another sphere overlaps
      float others = 1.;
      for (int j = 0; j < 3; j++) if (j != i) others *= 1. - ins[j];
      float d = length(q[i]);
      vec2 L = u_L[i];
      vec2 perp = vec2(-L.y, L.x);
      float edge = EDGE[i] * lit[i] * exp(-(1. - d) * 15.);
      float cap = CAP[i] * exp(-(1. - dot(q[i], L)) * 2.6);
      vec2 h = q[i] + L * .78;                               // haze band ~20% below the unlit pole
      float haze = HAZE[i] * exp(-pow(dot(h, perp), 2.) / .32 - pow(dot(h, L), 2.) / .0162);
      I += ins[i] * others * (edge + cap + haze);
      // a much fainter glow just outside that pole, with a dark gap at the rim
      vec2 h2 = q[i] + L * 1.18;
      I += (1. - ins[i]) * HAZE[i] * .25 * exp(-pow(dot(h2, perp), 2.) / .245 - pow(dot(h2, L), 2.) / .0288);
    }
    // lenses: black inside, a tight glow along their own edge
    for (int i = 0; i < 3; i++) for (int j = i + 1; j < 3; j++) {
      float e = max(sd[i], sd[j]);                           // <0 inside the lens
      float k = .009 * (u_s[i].z + u_s[j].z);
      // min(): outside the lens exp() would overflow to inf, and 0 * inf = NaN
      I += ins[i] * ins[j] * .45 * exp(min(e, 0.) / k);
    }
    // pure red, plus a pink-white core where the rim is brightest
    o = vec4(min(I, 1.), vec2(.47, .52) * clamp((I - 1.2) * 1.5, 0., 1.), 1.);
  }`;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VS), fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  // one triangle that covers the whole screen
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uScale = gl.getUniformLocation(prog, 'u_scale');
  const uS = gl.getUniformLocation(prog, 'u_s');
  const uL = gl.getUniformLocation(prog, 'u_L');

  // ---------- motion ----------
  // Keyframes every 0.5 s for t = 0..8 s, in video px (y down). The loop
  // plays 0 -> 8 s and then the same path backwards (16 s in total).
  const KEYS = [
    { // top
      x: [728, 732, 744, 756, 772, 792, 816, 844, 880, 912, 940, 964, 984, 1004, 1020, 1036, 1044],
      y: [-84, -70, -60, -44, -30, -14, 0, 20, 44, 64, 80, 92, 100, 104, 104, 96, 90],
      r: [288, 284, 286, 284, 288, 290, 292, 296, 298, 300, 300, 302, 302, 306, 308, 312, 316],
    },
    { // middle
      x: [924, 892, 856, 816, 776, 740, 704, 672, 652, 624, 604, 584, 568, 560, 556, 552, 548],
      y: [460, 460, 470, 474, 484, 492, 496, 502, 504, 500, 494, 484, 472, 466, 456, 452, 448],
      r: [266, 268, 270, 272, 272, 274, 276, 276, 278, 282, 286, 288, 290, 294, 296, 298, 300],
    },
    { // bottom
      x: [828, 836, 852, 872, 896, 920, 944, 966, 986, 1004, 1018, 1028, 1034, 1036, 1036, 1034, 1032],
      y: [1048, 1046, 1042, 1034, 1022, 1006, 988, 968, 948, 930, 916, 906, 898, 894, 892, 892, 892],
      r: Array(17).fill(340),
    },
  ];
  // Catmull-Rom spline through the keys; s in seconds, 0..8
  const spline = (a, s) => {
    const u = Math.max(0, Math.min(s * 2, a.length - 1));
    const i = Math.min(Math.floor(u), a.length - 2), f = u - i;
    const p0 = a[Math.max(i - 1, 0)], p1 = a[i], p2 = a[i + 1], p3 = a[Math.min(i + 2, a.length - 1)];
    return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f +
      (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
  };

  // ---------- mouse: spheres drift gently away from the cursor ----------
  const PUSH = 70;            // max push, in video px
  const EASE = 0.04;          // how fast a sphere follows / drifts back (per frame)
  let mouse = null;
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => {
      const b = canvas.getBoundingClientRect();
      if (e.clientY > b.bottom) { mouse = null; return; }
      const sc = Math.max(b.width / 1600, b.height / 900);
      mouse = { x: (e.clientX - b.left - b.width / 2) / sc, y: -(e.clientY - b.top - b.height / 2) / sc };
    }, { passive: true });
    document.addEventListener('pointerleave', () => { mouse = null; });
  }

  // ---------- render loop ----------
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  };
  const offset = KEYS.map(() => ({ x: 0, y: 0 }));
  const S = new Float32Array(9), Ld = new Float32Array(6);
  let t = 0, last = 0, running = false, onScreen = true;

  const draw = () => {
    resize();
    const tau = t % 16, s = tau <= 8 ? tau : 16 - tau;
    const scale = Math.max(canvas.width / 1600, canvas.height / 900);
    KEYS.forEach((k, i) => {
      const cx = spline(k.x, s) - 800, cy = 450 - spline(k.y, s), r = spline(k.r, s);
      let tx = 0, ty = 0;
      if (mouse) {
        const dx = cx - mouse.x, dy = cy - mouse.y, d = Math.hypot(dx, dy) || 1e-4;
        const f = PUSH * Math.exp(-(d * d) / (2 * (r * 1.1) ** 2));
        tx = dx / d * f; ty = dy / d * f;
      }
      offset[i].x += (tx - offset[i].x) * EASE;
      offset[i].y += (ty - offset[i].y) * EASE;
      S[i * 3] = cx + offset[i].x; S[i * 3 + 1] = cy + offset[i].y; S[i * 3 + 2] = r;
    });
    // light: the middle sphere is lit from below; top and bottom face the frame center
    for (let i = 0; i < 3; i++) {
      let lx = 0, ly = -1;
      if (i !== 1) {
        lx = -S[i * 3]; ly = -S[i * 3 + 1];
        const m = Math.hypot(lx, ly) || 1; lx /= m; ly /= m;
      }
      Ld[i * 2] = lx; Ld[i * 2 + 1] = ly;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uScale, scale);
    gl.uniform3fv(uS, S);
    gl.uniform2fv(uL, Ld);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const frame = (now) => {
    if (!running) return;
    t += Math.min((now - last) / 1000, 0.05);
    last = now;
    draw();
    requestAnimationFrame(frame);
  };
  const start = () => {
    if (running || !onScreen || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  };
  const stop = () => { running = false; };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    draw();                                   // one still frame
    window.addEventListener('resize', draw);
    return;
  }
  // only animate while the hero is on screen and the tab is visible
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      onScreen ? start() : stop();
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();
})();
