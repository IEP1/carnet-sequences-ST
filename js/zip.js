/* ============================================================
   CRÉATION / LECTURE DE .ZIP (sans dépendance externe)
   ============================================================ */

function strToUint8(str){ return new TextEncoder().encode(str); }

const CRC_TABLE = (function(){
  const table=[];
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++){ c=(c&1)?(0xEDB88320 ^ (c>>>1)):(c>>>1); }
    table[n]=c;
  }
  return table;
})();
function crc32(buf){
  let crc=0 ^ (-1);
  for(let i=0;i<buf.length;i++){ crc=(crc>>>8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF]; }
  return (crc ^ (-1)) >>> 0;
}
function dosTime(d){ return ((d.getHours()&0x1F)<<11) | ((d.getMinutes()&0x3F)<<5) | (Math.floor(d.getSeconds()/2)&0x1F); }
function dosDate(d){ return (((d.getFullYear()-1980)&0x7F)<<9) | (((d.getMonth()+1)&0xF)<<5) | (d.getDate()&0x1F); }

function createZip(files){
  const now=new Date(); const time=dosTime(now), date=dosDate(now);
  const localParts=[], centralParts=[]; let offset=0;
  files.forEach(f=>{
    const nameBytes=strToUint8(f.name); const data=f.data;
    const crc=crc32(data); const size=data.length;

    const local=new DataView(new ArrayBuffer(30));
    local.setUint32(0,0x04034b50,true); local.setUint16(4,20,true); local.setUint16(6,0,true);
    local.setUint16(8,0,true); local.setUint16(10,time,true); local.setUint16(12,date,true);
    local.setUint32(14,crc,true); local.setUint32(18,size,true); local.setUint32(22,size,true);
    local.setUint16(26,nameBytes.length,true); local.setUint16(28,0,true);
    const localHeaderBytes=new Uint8Array(local.buffer);
    localParts.push(localHeaderBytes, nameBytes, data);

    const central=new DataView(new ArrayBuffer(46));
    central.setUint32(0,0x02014b50,true); central.setUint16(4,20,true); central.setUint16(6,20,true);
    central.setUint16(8,0,true); central.setUint16(10,0,true); central.setUint16(12,time,true); central.setUint16(14,date,true);
    central.setUint32(16,crc,true); central.setUint32(20,size,true); central.setUint32(24,size,true);
    central.setUint16(28,nameBytes.length,true); central.setUint16(30,0,true); central.setUint16(32,0,true);
    central.setUint16(34,0,true); central.setUint16(36,0,true); central.setUint32(38,0,true);
    central.setUint32(42,offset,true);
    const centralHeaderBytes=new Uint8Array(central.buffer);
    centralParts.push(centralHeaderBytes, nameBytes);

    offset += localHeaderBytes.length + nameBytes.length + data.length;
  });
  const centralSize=centralParts.reduce((a,p)=>a+p.length,0);
  const centralOffset=offset;
  const end=new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true); end.setUint16(4,0,true); end.setUint16(6,0,true);
  end.setUint16(8,files.length,true); end.setUint16(10,files.length,true);
  end.setUint32(12,centralSize,true); end.setUint32(16,centralOffset,true); end.setUint16(20,0,true);

  return new Blob([...localParts, ...centralParts, new Uint8Array(end.buffer)], {type:'application/zip'});
}

/* Lecture d'une archive .zip « stored » (méthode 0, sans compression).
   Suffisant pour relire les archives produites par createZip() ci-dessus. */
function unzipStored(bytes){
  const dv=new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dec=new TextDecoder();
  const out=[]; let i=0;
  while(i+30<=bytes.length && dv.getUint32(i,true)===0x04034b50){
    const method=dv.getUint16(i+8,true);
    const compSize=dv.getUint32(i+18,true);
    const nameLen=dv.getUint16(i+26,true);
    const extraLen=dv.getUint16(i+28,true);
    const nameStart=i+30;
    const name=dec.decode(bytes.subarray(nameStart, nameStart+nameLen));
    const dataStart=nameStart+nameLen+extraLen;
    if(method!==0) throw new Error("archive compressée non prise en charge — importez le fichier .json");
    out.push({ name, data: bytes.subarray(dataStart, dataStart+compSize) });
    i=dataStart+compSize;
  }
  if(!out.length) throw new Error("archive illisible");
  return out;
}
