import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
const roots=['app','components','data','lib','supabase'];
const extensions=new Set(['.ts','.tsx','.js','.mjs','.json','.sql','.css','.md']);
const ignored=new Set(['node_modules','.next','.git']);
const broken=/(?:Ã.|Â.|â(?:€|€™|€œ|€“|€”)|ðŸ|\uFFFD)/u;
const failures=[];
async function walk(directory){for(const entry of await readdir(directory,{withFileTypes:true})){if(ignored.has(entry.name))continue;const path=join(directory,entry.name);if(entry.isDirectory())await walk(path);else if(extensions.has(extname(entry.name))){const content=await readFile(path,'utf8');content.split(/\r?\n/).forEach((line,index)=>{if(broken.test(line))failures.push(`${relative(process.cwd(),path)}:${index+1}`)})}}}
for(const root of roots)await walk(root);
if(failures.length){console.error(`Mojibake detected:\n${failures.join('\n')}`);process.exit(1)}
console.log('Encoding check passed.');
