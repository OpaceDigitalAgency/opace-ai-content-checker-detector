declare module "node:fs/promises"{export function readFile(path:string):Promise<Uint8Array>;export function writeFile(path:string,data:string|Uint8Array,options?:unknown):Promise<void>;export function stat(path:string):Promise<{size:number}>;}
declare module "node:fs"{export function createReadStream(path:string):AsyncIterable<Uint8Array>&{destroy(error?:Error):void};export function realpathSync(path:string):string;}
declare module "node:url"{export function fileURLToPath(url:string):string;}
declare module "node:process"{const value:{argv:string[];stdin:AsyncIterable<Uint8Array>;stdout:{write(v:string):void};stderr:{write(v:string):void};env:Record<string,string|undefined>;exitCode?:number};export default value;}
declare module "node:crypto"{export function createHash(name:string):{update(value:string):any;digest(format:"hex"):string};}
declare module "canonicalize"{export default function canonicalize(value:unknown):string|undefined;}
