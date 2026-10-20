// Sequential verification with durable, commit-keyed evidence. Never archives server logs or user data.
import {spawn} from 'node:child_process';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readdirSync,copyFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const sha=git('rev-parse','HEAD'),status=git('status','--short');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const out=join('tests',sha,stamp+(status?'-working-tree':''));mkdirSync(join(out,'results'),{recursive:true});
const metadata={baseCommit:sha,testedState:status?'uncommitted working tree':'clean commit',startedAt:new Date().toISOString(),status,commands:[]};
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);}
for(const file of [...walk('src').filter(f=>f.endsWith('.test.ts')||f.includes('/fixtures/')||f.endsWith('test-setup.ts')),...walk('e2e').filter(f=>!f.includes('/out/')&&(f.endsWith('.mjs')||f.endsWith('.sh'))),'vite.config.ts','package.json', 'scripts/verify-and-record.mjs']){const target=join(out,'test-sources',file+(file==='vite.config.ts'?'.snapshot':''));mkdirSync(dirname(target),{recursive:true});copyFileSync(file,target);}
writeFileSync(join(out,'working-tree.patch'),execFileSync('git',['diff','HEAD','--','.',':(exclude)tests']));
const browserFiles=process.argv.find(a=>a.startsWith('--browser='))?.slice(10).split(',')??[];
const selected=process.argv.find(a=>a.startsWith('--phase='))?.split('=')[1];
const phases=[['sync',process.execPath,['node_modules/@sveltejs/kit/svelte-kit.js','sync']],['check',process.execPath,['node_modules/svelte-check/bin/svelte-check','--tsconfig','./tsconfig.json']],['unit',process.execPath,['node_modules/vitest/vitest.mjs','run','--reporter=default','--reporter=json','--outputFile='+join(out,'results','unit.json')]],['build',process.execPath,['node_modules/vite/bin/vite.js','build']],['browser','bash',['e2e/run-all.sh',...browserFiles]]];
let failed=false;
for(const [name,command,args] of phases){if(selected&&selected!==name&&!(selected==='check'&&name==='sync'))continue;
 console.log('Verifying '+name+'; results: '+out);
 const log=[];const exitCode=await new Promise(resolve=>{const child=spawn(command,args,{env:{...process.env,PATH:dirname(process.execPath)+':'+process.env.PATH,BODY_SIZE_LIMIT:'6M'},stdio:['ignore','pipe','pipe']});child.stdout.on('data',chunk=>{log.push(chunk);process.stdout.write(chunk);});child.stderr.on('data',chunk=>{log.push(chunk);process.stderr.write(chunk);});child.on('error',e=>{log.push(Buffer.from(e.message));resolve(1);});child.on('close',code=>resolve(code??1));});
 writeFileSync(join(out,'results',name+'.log'),Buffer.concat(log));metadata.commands.push({name,command,args,exitCode});
 if(name==='browser'&&existsSync('e2e/out'))for(const file of readdirSync('e2e/out').filter(f=>/^step.*\.mjs\.log$/.test(f)&&(!browserFiles.length||browserFiles.some(path=>f===path.split('/').at(-1)+'.log'))))copyFileSync(join('e2e/out',file),join(out,'results',file));
 if(exitCode){failed=true;break;}
}
metadata.finishedAt=new Date().toISOString();metadata.passed=!failed;writeFileSync(join(out,'results.json'),JSON.stringify(metadata,null,2)+'\n');console.log('Test archive: '+out);process.exitCode=failed?1:0;
