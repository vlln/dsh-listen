import {PNG} from 'pngjs';
// Local 5x7 pixel geometry. No OS font or rendering runtime is required.
const GLYPHS={
 '0':'0E11131519110E','1':'040C040404040E','2':'0E11010204081F','3':'1E01010E01011E','4':'02060A121F0202',
 '5':'1F10101E01011E','6':'0E10101E11110E','7':'1F010204080808','8':'0E11110E11110E','9':'0E11110F01010E',
 A:'0E11111F111111',B:'1E11111E11111E',C:'0F10101010100F',D:'1E11111111111E',E:'1F10101E10101F',F:'1F10101E101010',
 G:'0F10101711110F',H:'1111111F111111',I:'1F04040404041F',J:'0702020212120C',K:'11121418141211',L:'1010101010101F',
 M:'111B1515111111',N:'11191513111111',O:'0E11111111110E',P:'1E11111E101010',Q:'0E11111115120D',R:'1E11111E141211',
 S:'0F10100E01011E',T:'1F040404040404',U:'1111111111110E',V:'11111111110A04',W:'1111111515150A',X:'11110A040A1111',Y:'11110A04040404',Z:'1F01020408101F',
 ' ':'00000000000000','-':'0000001F000000','.':'00000000000C0C','/':'01020204080810',':':'000C0C000C0C00'
};
export function formatNumber(value){if(!Number.isFinite(value))throw Error('INVALID_NUMBER');return Math.abs(value)>=100?String(Math.round(value)):value.toFixed(2);}
export class Raster{
 constructor(width,height){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>2000||height>3060)throw Error('INVALID_RASTER');this.width=width;this.height=height;this.image=new PNG({width,height});this.image.data.fill(255);}
 pixel(x,y,color){if(!Number.isFinite(x)||!Number.isFinite(y)||!Array.isArray(color)||color.length!==3||color.some(v=>!Number.isFinite(v)||v<0||v>255))throw Error('INVALID_PIXEL');x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=this.width||y>=this.height)return;const i=(y*this.width+x)*4;this.image.data[i]=color[0];this.image.data[i+1]=color[1];this.image.data[i+2]=color[2];this.image.data[i+3]=255;}
 line(x0,y0,x1,y1,color){if([x0,y0,x1,y1].some(v=>!Number.isFinite(v)||Math.abs(v)>10000))throw Error('INVALID_LINE');const steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);for(let i=0;i<=steps;i++)this.pixel(x0+(x1-x0)*i/steps,y0+(y1-y0)*i/steps,color);}
 rect(x,y,width,height,color){if([x,y,width,height].some(v=>!Number.isFinite(v))||!Number.isInteger(width)||!Number.isInteger(height)||width<0||height<0||width>2000||height>1600)throw Error('INVALID_RECT');for(let j=0;j<height;j++)for(let i=0;i<width;i++)this.pixel(x+i,y+j,color);}
 text(value,x,y,scale=2,color=[25,35,45]){
  if(!Number.isInteger(scale)||scale<1||scale>4)throw Error('INVALID_TEXT_SCALE');
  if(!Number.isFinite(x)||!Number.isFinite(y)||typeof value!=='string'||value.length>200)throw Error('INVALID_TEXT');
  for(const char of String(value).toUpperCase()){
   const glyph=GLYPHS[char];if(!glyph)throw Error('UNSUPPORTED_GLYPH');
   for(let row=0;row<7;row++){const bits=parseInt(glyph.slice(row*2,row*2+2),16);for(let col=0;col<5;col++)if(bits&(1<<(4-col)))this.rect(x+col*scale,y+row*scale,scale,scale,color);}
   x+=6*scale;
  }
 }
 encode(){return PNG.sync.write(this.image);}
}
