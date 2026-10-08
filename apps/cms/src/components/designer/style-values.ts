const colors=new Map<string,string>();
let context:CanvasRenderingContext2D|null|undefined;
/** Native color inputs require sRGB hex; computed CSS can be rgb/oklch/etc. */
export function colorHex(value:string,fallback=''):string {
  if(/^#[a-f\d]{6}$/i.test(value))return value;
  const short=value.match(/^#([a-f\d])([a-f\d])([a-f\d])$/i);if(short)return `#${short[1].repeat(2)}${short[2].repeat(2)}${short[3].repeat(2)}`;
  const rgb=value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if(rgb)return '#'+rgb.slice(1).map(component=>Math.max(0,Math.min(255,Math.round(Number(component)))).toString(16).padStart(2,'0')).join('');
  if(value.includes('var('))return colorHex(fallback);
  if(colors.has(value))return colors.get(value)!;
  if(typeof document==='undefined'||typeof CSS==='undefined'||!CSS.supports('color',value))return fallback?colorHex(fallback):'#000000';
  context??=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
  if(!context)return '#000000';
  context.clearRect(0,0,1,1);context.fillStyle=value;context.fillRect(0,0,1,1);
  const bytes=context.getImageData(0,0,1,1).data,result='#'+Array.from(bytes.slice(0,3),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(colors.size>100)colors.clear();colors.set(value,result);return result;
}
