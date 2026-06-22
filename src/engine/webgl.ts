// A tiny, dependency-free WebGL helper that renders a single full-screen
// fragment shader. Every ImmerseOS generative scene is one fragment shader
// driven by a handful of uniforms, which keeps the engine fast enough to
// drive multiple 4K projector outputs at once.

export interface SceneUniforms {
  time: number;
  intensity: number; // 0..1  overall brightness / energy
  speed: number; // 0..2  animation rate multiplier
  hue: number; // 0..1  colour rotation
  scale: number; // 0..2  feature size
}

const VERTEX_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const PREAMBLE = `
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform float u_intensity;
uniform float u_speed;
uniform float u_hue;
uniform float u_scale;

vec3 hueShift(vec3 color, float h) {
  const vec3 k = vec3(0.57735);
  float c = cos(h * 6.2831853);
  return color * c + cross(k, color) * sin(h * 6.2831853) + k * dot(k, color) * (1.0 - c);
}
`;

export class ShaderRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private loc: Record<string, WebGLUniformLocation | null> = {};
  private raf = 0;
  private start = performance.now();
  private getUniforms: () => SceneUniforms;

  constructor(
    private canvas: HTMLCanvasElement,
    fragmentBody: string,
    getUniforms: () => SceneUniforms,
  ) {
    const gl = canvas.getContext('webgl', {
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error('WebGL is not available on this display.');
    this.gl = gl;
    this.getUniforms = getUniforms;
    this.compile(fragmentBody);
    this.setupQuad();
  }

  /** Hot-swap the active scene without tearing down the GL context. */
  setScene(fragmentBody: string) {
    this.compile(fragmentBody);
    this.setupQuad();
  }

  private compile(fragmentBody: string) {
    const gl = this.gl;
    const vs = this.shader(gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = this.shader(gl.FRAGMENT_SHADER, PREAMBLE + fragmentBody);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Shader link failed: ' + gl.getProgramInfoLog(program));
    }
    if (this.program) gl.deleteProgram(this.program);
    this.program = program;
    gl.useProgram(program);
    this.loc = {
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_intensity: gl.getUniformLocation(program, 'u_intensity'),
      u_speed: gl.getUniformLocation(program, 'u_speed'),
      u_hue: gl.getUniformLocation(program, 'u_hue'),
      u_scale: gl.getUniformLocation(program, 'u_scale'),
    };
  }

  private shader(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error('Shader compile failed: ' + log);
    }
    return sh;
  }

  private setupQuad() {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const pos = gl.getAttribLocation(this.program!, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  }

  private resize() {
    const { canvas, gl } = this;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  start_() {
    const loop = () => {
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private render() {
    const gl = this.gl;
    this.resize();
    const u = this.getUniforms();
    const t = ((performance.now() - this.start) / 1000) * u.speed + u.time;
    gl.uniform2f(this.loc.u_resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(this.loc.u_time, t);
    gl.uniform1f(this.loc.u_intensity, u.intensity);
    gl.uniform1f(this.loc.u_speed, u.speed);
    gl.uniform1f(this.loc.u_hue, u.hue);
    gl.uniform1f(this.loc.u_scale, u.scale);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    const ext = gl.getExtension('WEBGL_lose_context');
    ext?.loseContext();
  }
}
