/**
 * Deterministic, non-radial shattered-floor layouts for the pixel-art arenas.
 * This module has no Phaser/DOM dependency and is tested by Node during build.
 *
 * A small number of asymmetric floor plates and long staggered faults replace
 * the previous spiderweb pattern of 9-17 equally spaced radial spokes.
 */
export type FracturePreset='small'|'heavy'|'ultimate';
export type PixelPoint=Readonly<{x:number;y:number}>;
export type Plate=Readonly<{points:readonly PixelPoint[];tone:number}>;
export type Fault=readonly PixelPoint[];
export type Chip=Readonly<{x:number;y:number;width:number;height:number;tone:number}>;
export interface FracturePlan {
  readonly preset:FracturePreset;
  readonly width:128;
  readonly height:80;
  readonly core:readonly PixelPoint[];
  readonly plates:readonly Plate[];
  readonly faults:readonly Fault[];
  readonly chips:readonly Chip[];
}
export const FRACTURE_PRESETS={
  small:{plateCount:2,faultCount:1,chipCount:5,scale:0.64},
  heavy:{plateCount:4,faultCount:2,chipCount:12,scale:0.82},
  ultimate:{plateCount:6,faultCount:3,chipCount:22,scale:1}
} as const;

/* Uneven, staggered slabs, deliberately without wedges meeting at a center. */
const PLATES:readonly (readonly (readonly [number,number])[])[]=[
  [[-42,-13],[-31,-25],[-13,-24],[-8,-13],[-22,-4],[-38,-6]],
  [[-8,-27],[13,-25],[24,-15],[10,-8],[-5,-12]],
  [[23,-20],[40,-15],[45,-3],[33,4],[16,-4]],
  [[-42,0],[-24,2],[-14,14],[-23,25],[-41,16]],
  [[-17,16],[-1,10],[11,19],[7,29],[-13,26]],
  [[18,11],[30,5],[44,13],[37,25],[21,27],[13,20]]
];
/* Only 1-3 long faults, starting in different places; no symmetric spokes. */
const FAULTS:readonly (readonly (readonly [number,number])[])[]=[
  [[-48,-10],[-35,-13],[-26,-7],[-17,-10],[-7,-4],[4,-8],[15,-3]],
  [[5,-8],[18,-12],[27,-20],[38,-17],[47,-19]],
  [[-11,11],[0,16],[9,12],[20,21],[28,28]]
];
const CORE:readonly (readonly [number,number])[]=[
  [-19,-5],[-11,-13],[1,-10],[12,-5],[19,4],[12,14],
  [1,12],[-9,18],[-21,7]
];

export function buildFracturePlan(seed:number,preset:FracturePreset):FracturePlan{
  const config=FRACTURE_PRESETS[preset];
  let state=seed>>>0||0x8f31ac42;
  const random=()=>{
    state^=state<<13;state^=state>>>17;state^=state<<5;
    return(state>>>0)/4294967296;
  };
  const snap=(value:number)=>Math.round(value/2)*2;
  const mirror=random()>0.5?-1:1;
  const px=(x:number)=>snap(Math.max(2,Math.min(126,64+mirror*x*config.scale)));
  const py=(y:number)=>snap(Math.max(2,Math.min(78,40+y*config.scale)));
  const point=(xy:readonly [number,number],jitter=0):PixelPoint=>({
    x:px(xy[0]+(random()-0.5)*jitter),
    y:py(xy[1]+(random()-0.5)*jitter)
  });
  const core=CORE.map(xy=>point(xy,1.6));
  const chosenPlateIndices=preset==='small'?[0,3]:
    preset==='heavy'?[0,1,3,5]:[0,1,2,3,4,5];
  const plates=chosenPlateIndices.map((idx,i):Plate=>({
    points:PLATES[idx].map(xy=>point(xy,2.7)),
    tone:(i+Math.floor(random()*3))%3
  }));
  const faults=FAULTS.slice(0,config.faultCount)
    .map(line=>line.map(xy=>point(xy,3.8)));
  const chips:Chip[]=Array.from({length:config.chipCount},(_,i)=>{
    const theta=random()*Math.PI*2;
    const distance=12+Math.sqrt(random())*(preset==='ultimate'?43:33)*config.scale;
    const x=px(Math.cos(theta)*distance);
    const y=py(Math.sin(theta)*distance*0.68);
    const size=i%5===0?6:i%3===0?4:2;
    return {x,y,width:size,height:i%4===0?4:2,tone:i%3};
  });
  return {preset,width:128,height:80,core,plates,faults,chips};
}
