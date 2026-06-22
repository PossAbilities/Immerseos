import { useEffect, useRef } from 'react';

// Real-time equirectangular → per-wall reprojection. Each wall is a rectilinear
// (perspective) "window" onto a 360° panorama sphere, sampled from an
// equirectangular image or video. This is how one 360 asset maps undistorted
// onto the walls + floor of any room (the core immersive-room technique).

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
const FRAG = `
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_res;
uniform float u_yaw;   // radians
uniform float u_pitch; // radians
uniform float u_hfov;  // radians (half horizontal fov)
const float PI = 3.14159265359;
mat3 rotY(float a){ float c=cos(a),s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
mat3 rotX(float a){ float c=cos(a),s=sin(a); return mat3(1.,0.,0., 0.,c,-s, 0.,s,c); }
void main(){
  vec2 ndc = (gl_FragCoord.xy / u_res) * 2.0 - 1.0;
  float aspect = u_res.x / u_res.y;
  float th = tan(u_hfov);
  vec3 dir = normalize(vec3(th * ndc.x, (th / aspect) * ndc.y, -1.0));
  dir = rotY(u_yaw) * rotX(u_pitch) * dir;
  float lon = atan(dir.x, -dir.z);
  float lat = asin(clamp(dir.y, -1.0, 1.0));
  vec2 uv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
  gl_FragColor = texture2D(u_tex, uv);
}`;

const d2r = (d: number) => (d * Math.PI) / 180;

export function EquirectSurface({
  src,
  yawDeg,
  pitchDeg,
  hfovDeg = 45,
  className,
}: {
  src: string;
  yawDeg: number;
  pitchDeg: number;
  hfovDeg?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isVideo = /\.(mp4|mov|webm|ogg)(\?|$)/i.test(src);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) {
      canvas.style.background = '#0c0e12';
      return;
    }

    const compile = (type: number, s: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, s);
      gl.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // placeholder until media loads
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([12, 14, 18, 255]));

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uYaw = gl.getUniformLocation(prog, 'u_yaw');
    const uPitch = gl.getUniformLocation(prog, 'u_pitch');
    const uHfov = gl.getUniformLocation(prog, 'u_hfov');

    let media: HTMLImageElement | HTMLVideoElement | null = null;
    let ready = false;
    let video: HTMLVideoElement | null = null;
    if (isVideo) {
      video = document.createElement('video');
      video.src = src;
      video.crossOrigin = 'anonymous';
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(() => {});
      video.addEventListener('playing', () => { ready = true; });
      media = video;
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        ready = true;
      };
      img.src = src;
      media = img;
    }

    let raf = 0;
    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (video && ready && video.readyState >= 2) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video); } catch { /* not decodable yet */ }
      }
      gl.useProgram(prog);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uYaw, d2r(yawDeg));
      gl.uniform1f(uPitch, d2r(pitchDeg));
      gl.uniform1f(uHfov, d2r(hfovDeg));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      if (video) { video.pause(); video.src = ''; }
      gl.deleteTexture(tex);
      gl.deleteProgram(prog);
      const ext = gl.getExtension('WEBGL_lose_context');
      ext?.loseContext();
      void media;
    };
  }, [src, yawDeg, pitchDeg, hfovDeg, isVideo]);

  return <canvas ref={canvasRef} className={className} />;
}
