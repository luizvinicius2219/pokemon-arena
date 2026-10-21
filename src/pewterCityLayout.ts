/** Pixel-map bounds for the image at 960 × 576 world coordinates.
 * The source art is a 2× render of a 480 × 288 pixel tile map.
 * Keep these coordinates synchronized with the supplied Pewter artwork.
 */
export const PEWTER_CITY={
  pokemonCenter:{x:149,y:257,reach:72},
  gym:{x:839,y:227,reach:86},
  trainer:{x:347,y:404,reach:94},
  grass:{left:468,right:775,top:215,bottom:433},
  spawn:{x:231,y:424}
} as const;

const rect=(x:number,y:number,x1:number,y1:number,x2:number,y2:number)=>
  x>=x1&&x<=x2&&y>=y1&&y<=y2;

/** Do not let Red cross house walls, the pond, or the actual pixel-map fences. */
export function pewterCityBlocked(x:number,y:number):boolean{
  if(!Number.isFinite(x)||!Number.isFinite(y))return true;
  if(x<37||x>923||y<93||y>496)return true;
  // A strip of trees occupies the southern edge. The gym route stays open.
  if(y>482 && !(x>792&&x<865))return true;
  // Pokémon Center: the doorway is accessible at the bottom of its wall.
  if(rect(x,y,60,105,237,251) &&
    !(rect(x,y,126,215,176,251)))return true;
  // Blue-roofed house has its own usable doorway.
  if(rect(x,y,278,123,436,251) &&
    !(rect(x,y,330,218,379,251)))return true;
  // Pewter Gym: leave the front door open for the Brock interaction.
  if(rect(x,y,749,50,931,209) &&
    !(rect(x,y,804,172,868,209)))return true;
  // Pond and its stone border; the small bridge is walkable.
  if(rect(x,y,34,271,194,373) &&
    !(rect(x,y,164,350,222,378)))return true;
  // Tall-grass enclosure has a walkable western entrance by the signs.
  if(rect(x,y,451,200,464,330)||
     rect(x,y,451,410,464,439)||
     rect(x,y,451,198,784,214)||
     rect(x,y,481,445,738,469)||
     rect(x,y,782,204,799,445))return true;
  return false;
}

export function inPewterGrass(x:number,y:number):boolean{
  const g=PEWTER_CITY.grass;
  return x>g.left&&x<g.right&&y>g.top&&y<g.bottom;
}
