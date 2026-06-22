// The built-in ImmerseOS scene library. Each scene is a GLSL fragment body
// (it must assign gl_FragColor) plus presentation metadata used throughout the
// Library, Creator and Theater Control surfaces.

export interface Scene {
  id: string;
  name: string;
  category: 'Nature' | 'Sci-Fi' | 'Abstract' | 'Generative' | 'Calm';
  tagline: string;
  description: string;
  accent: string; // hex used for cards / glows
  fragment: string;
  defaults: { intensity: number; speed: number; hue: number; scale: number };
}

// ---- shared GLSL noise helpers, prepended to every scene body ----
const LIB = `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v=0., a=0.5;
  for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.0; a*=0.5; }
  return v;
}
`;

function scene(s: Omit<Scene, 'fragment'> & { body: string }): Scene {
  const { body, ...rest } = s;
  return { ...rest, fragment: LIB + '\nvoid main(){\n' + body + '\n}' };
}

export const SCENES: Scene[] = [
  scene({
    id: 'nebula-drift',
    name: 'Nebula Drift',
    category: 'Sci-Fi',
    tagline: 'Deep-space cloudscape',
    description:
      'Slow volumetric nebulae bloom and dissolve across the walls — a calm, cosmic backdrop for relaxation or wonder sessions.',
    accent: '#8083ff',
    defaults: { intensity: 0.9, speed: 0.5, hue: 0.0, scale: 1.0 },
    body: `
      vec2 uv=(gl_FragCoord.xy*2.-u_resolution)/u_resolution.y;
      uv*=mix(2.2,0.8,clamp(u_scale*0.5,0.,1.));
      float t=u_time*0.15;
      float n=fbm(uv*1.5+vec2(t,t*0.3));
      n+=0.5*fbm(uv*3.0-vec2(t*0.6,t));
      vec3 a=vec3(0.05,0.07,0.25), b=vec3(0.45,0.25,0.85), c=vec3(0.0,0.85,0.95);
      vec3 col=mix(a,b,smoothstep(0.2,0.9,n));
      col+=c*pow(max(n-0.55,0.),2.0)*1.5;
      float stars=step(0.997,hash(floor(gl_FragCoord.xy*0.5)));
      col+=stars*vec3(0.9,0.95,1.0);
      col=hueShift(col,u_hue);
      gl_FragColor=vec4(col*u_intensity,1.0);`,
  }),
  scene({
    id: 'deep-sea',
    name: 'Deep Sea: Biolume',
    category: 'Nature',
    tagline: 'Bioluminescent depths',
    description:
      'Multi-channel underwater caustics with drifting bioluminescent particles. Pairs beautifully with calming, low-frequency audio.',
    accent: '#00daf3',
    defaults: { intensity: 0.85, speed: 0.6, hue: 0.0, scale: 1.0 },
    body: `
      vec2 uv=gl_FragCoord.xy/u_resolution.xy;
      vec2 p=uv*vec2(u_resolution.x/u_resolution.y,1.0)*(6.0/max(u_scale,0.3));
      float t=u_time*0.4;
      float caust=0.0;
      for(int i=1;i<=4;i++){
        float fi=float(i);
        caust+=abs(sin(p.x*fi+t)+cos(p.y*fi-t))/fi;
      }
      caust=pow(caust*0.35,2.0);
      vec3 deep=vec3(0.0,0.05,0.12), glow=vec3(0.0,0.6,0.7);
      vec3 col=mix(deep,glow,clamp(caust,0.,1.));
      // bioluminescent motes
      vec2 g=floor(uv*40.0); float m=hash(g);
      float mote=smoothstep(0.98,1.0,m)*(0.5+0.5*sin(t*3.0+m*30.0));
      col+=vec3(0.2,0.9,1.0)*mote;
      col+=vec3(0.0,0.3,0.4)*(1.0-uv.y)*0.6;
      col=hueShift(col,u_hue);
      gl_FragColor=vec4(col*u_intensity,1.0);`,
  }),
  scene({
    id: 'zen-void',
    name: 'Zen Void',
    category: 'Calm',
    tagline: 'Meditative gradient field',
    description:
      'A near-still breathing gradient designed for sensory regulation and mindfulness. Minimal motion, maximal calm.',
    accent: '#bdf4ff',
    defaults: { intensity: 0.7, speed: 0.25, hue: 0.0, scale: 1.0 },
    body: `
      vec2 uv=gl_FragCoord.xy/u_resolution.xy;
      float t=u_time*0.2;
      float wave=fbm(vec2(uv.x*1.5, uv.y*1.5 + t*0.3));
      float breathe=0.5+0.5*sin(t*0.6);
      vec3 top=vec3(0.05,0.10,0.20), bot=vec3(0.35,0.55,0.65);
      vec3 col=mix(bot,top,uv.y+wave*0.15);
      col+=vec3(0.1,0.2,0.25)*breathe*0.4;
      col=hueShift(col,u_hue);
      gl_FragColor=vec4(col*u_intensity,1.0);`,
  }),
  scene({
    id: 'digital-forest',
    name: 'Digital Forest',
    category: 'Nature',
    tagline: 'Generative canopy',
    description:
      'Dappled light filtering through an algorithmic forest canopy. Gentle organic motion with warm green tones.',
    accent: '#7ee0a0',
    defaults: { intensity: 0.85, speed: 0.5, hue: 0.0, scale: 1.0 },
    body: `
      vec2 uv=gl_FragCoord.xy/u_resolution.xy;
      vec2 p=uv*(5.0/max(u_scale,0.3));
      float t=u_time*0.3;
      float leaves=fbm(p*2.0+vec2(0.0,t));
      float light=fbm(p*0.8-vec2(t*0.2,0.0));
      vec3 dark=vec3(0.02,0.10,0.04), mid=vec3(0.10,0.40,0.15), sun=vec3(0.8,0.95,0.5);
      vec3 col=mix(dark,mid,leaves);
      col+=sun*pow(max(light-0.55,0.),2.0)*2.0;
      col=hueShift(col,u_hue);
      gl_FragColor=vec4(col*u_intensity,1.0);`,
  }),
  scene({
    id: 'neon-pulse',
    name: 'Neon Pulse',
    category: 'Abstract',
    tagline: 'Reactive grid',
    description:
      'A high-energy neon grid that pulses with rhythm — ideal for active sessions, dance and movement work.',
    accent: '#4b8eff',
    defaults: { intensity: 1.0, speed: 1.0, hue: 0.0, scale: 1.0 },
    body: `
      vec2 uv=(gl_FragCoord.xy*2.-u_resolution)/u_resolution.y;
      float t=u_time;
      vec2 g=uv*(6.0*max(u_scale,0.3));
      vec2 grid=abs(fract(g)-0.5);
      float line=smoothstep(0.48,0.5,max(grid.x,grid.y));
      float pulse=0.5+0.5*sin(t*3.0 - length(uv)*4.0);
      vec3 col=vec3(0.0);
      col+=vec3(0.1,0.4,1.0)*line*(0.4+pulse);
      col+=vec3(0.6,0.1,0.9)*(1.0-line)*pulse*0.3;
      col+=vec3(0.0,0.9,1.0)*pow(pulse,4.0)*0.5;
      col=hueShift(col,u_hue);
      gl_FragColor=vec4(col*u_intensity,1.0);`,
  }),
  scene({
    id: 'orions-edge',
    name: "Orion's Edge",
    category: 'Sci-Fi',
    tagline: 'Aurora horizon',
    description:
      'Sweeping auroral curtains over a starfield horizon. A slow, awe-inspiring journey to the edge of the system.',
    accent: '#adc6ff',
    defaults: { intensity: 0.9, speed: 0.5, hue: 0.0, scale: 1.0 },
    body: `
      vec2 uv=gl_FragCoord.xy/u_resolution.xy;
      float t=u_time*0.3;
      float horizon=0.45;
      vec3 col=vec3(0.02,0.03,0.08);
      // aurora curtains in the upper sky
      if(uv.y>horizon){
        float s=(uv.y-horizon)/(1.0-horizon);
        float curtain=fbm(vec2(uv.x*3.0+t, s*2.0));
        float band=sin(uv.x*8.0 + curtain*4.0 + t)*0.5+0.5;
        vec3 aur=mix(vec3(0.0,0.8,0.6),vec3(0.4,0.3,0.9),band);
        col+=aur*pow(1.0-s,1.5)*curtain*1.4;
        float stars=step(0.997,hash(floor(gl_FragCoord.xy)));
        col+=stars*vec3(1.0)*s;
      } else {
        col=mix(vec3(0.03,0.05,0.1),col,uv.y/horizon);
      }
      col=hueShift(col,u_hue);
      gl_FragColor=vec4(col*u_intensity,1.0);`,
  }),
  scene({
    id: 'aurora-flow',
    name: 'Aurora Flow',
    category: 'Generative',
    tagline: 'Liquid light ribbons',
    description:
      'Silky ribbons of flowing colour that never repeat. A versatile, hypnotic wallpaper for any room mood.',
    accent: '#c0c1ff',
    defaults: { intensity: 0.9, speed: 0.6, hue: 0.0, scale: 1.0 },
    body: `
      vec2 uv=(gl_FragCoord.xy*2.-u_resolution)/u_resolution.y;
      float t=u_time*0.2;
      float f=0.0;
      for(int i=0;i<3;i++){
        float fi=float(i)+1.0;
        f+=sin(uv.x*fi*1.5 + t*fi + fbm(uv+t)*3.0)/fi;
      }
      float band=smoothstep(0.0,0.4,0.4-abs(uv.y - f*0.4));
      vec3 a=vec3(0.2,0.1,0.6), b=vec3(0.0,0.7,0.9), c=vec3(0.7,0.2,0.8);
      vec3 col=mix(a,b,0.5+0.5*sin(t+uv.x));
      col=mix(col,c,band);
      col+=band*vec3(0.3,0.4,0.6);
      col=hueShift(col,u_hue);
      gl_FragColor=vec4(col*u_intensity,1.0);`,
  }),
  scene({
    id: 'ember-calm',
    name: 'Ember Calm',
    category: 'Calm',
    tagline: 'Warm firelight',
    description:
      'The soft flicker of a hearth without the heat. Warm ambers and reds for cosy, grounding sessions.',
    accent: '#ffb59c',
    defaults: { intensity: 0.8, speed: 0.5, hue: 0.0, scale: 1.0 },
    body: `
      vec2 uv=gl_FragCoord.xy/u_resolution.xy;
      vec2 p=uv*(4.0/max(u_scale,0.3));
      float t=u_time*0.5;
      float fire=fbm(p+vec2(0.0,t*1.5));
      fire+=0.5*fbm(p*2.0-vec2(t,0.0));
      vec3 col=vec3(0.05,0.02,0.0);
      col+=vec3(0.9,0.35,0.05)*pow(fire,1.5);
      col+=vec3(1.0,0.7,0.2)*pow(max(fire-0.6,0.),2.0)*2.0;
      col*=mix(0.6,1.1,1.0-uv.y);
      col=hueShift(col,u_hue);
      gl_FragColor=vec4(col*u_intensity,1.0);`,
  }),
];

export const SCENE_MAP: Record<string, Scene> = Object.fromEntries(
  SCENES.map((s) => [s.id, s]),
);

export function getScene(id: string | undefined): Scene {
  return (id && SCENE_MAP[id]) || SCENES[0];
}
