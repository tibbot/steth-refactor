const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');const {chromium}=require('playwright');
const root=process.env.APP_ROOT||path.resolve(__dirname,'..'),core=process.env.CORE_ROOT;if(!core)throw Error('Set CORE_ROOT.');
const member=process.env.MEMBER_CONTRACT||path.join(root,'wwwroot/js/modules/contracts/member-contract.js');
const controller=fs.existsSync(path.join(root,'wwwroot/js/modules/research.js'))?'research':'incident';
const source=fs.readFileSync(path.join(root,'wwwroot/js/modules',controller+'.js'),'utf8').replaceAll('\r\n','\n');
const start=source.indexOf('    async showReferenceCollections('),end=source.indexOf('    async _showDetail(',start);
const fixture="import * as Core from '/core.js';import {createMemberContract} from '/contracts/member-contract.js';import {createProviderContract} from '/contracts/provider-contract.js';import {createVendorContract} from '/contracts/vendor-contract.js';export class Fixture {constructor(){this._detailGeneration=0;}"+source.slice(start,end)+" _showDetail(){} _clearReferenceSystem(){this._rmgr?.destroy();this._clct?.destroy();this._rmgr=null;this._clct=null;} }";
const ts=require(path.join(core,'node_modules/typescript'));
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/css/core-vars.css"><link rel="stylesheet" href="/css/core.css"><link rel="stylesheet" href="/css/modl.css"><link rel="stylesheet" href="/css/fltr.css"><link rel="stylesheet" href="/css/clct.css"><div class="clct dnd"></div><dialog id="modl"><div id="modl-hdr"></div><div id="modl-body"></div><div id="modl-ftr"></div></dialog>');}
 if(url.pathname==='/favicon.ico'){res.statusCode=204;return res.end();}
 if(/^\/css\/[a-z-]+\.css$/.test(url.pathname)){res.setHeader('Content-Type','text/css');return res.end(fs.readFileSync(path.join(core,'public',url.pathname)));}
 res.setHeader('Content-Type','text/javascript');
 if(url.pathname==='/fixture.js')return res.end(fixture);
 if(url.pathname==='/core.js')return res.end("export * from '/rmgr.js';export * from '/fltr.js';export * from '/clct.js';export * from '/tblm.js';export const post=(...args)=>window.mockPost(...args);");
 if(/^\/contracts\/[a-z-]+\.js$/.test(url.pathname)){const file=url.pathname.endsWith('/member-contract.js')?member:path.join(root,'wwwroot/js/modules',url.pathname);return res.end(fs.readFileSync(file,'utf8').replaceAll('http://localhost/core-service/','/core.js'));}
 const name=url.pathname.slice(1).replace(/\.js$/,'');const file=path.join(core,'src/js',name+'.ts');if(!/^[a-z]+$/.test(name)||!fs.existsSync(file)){res.statusCode=404;return res.end();}
 res.end(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText.replace(/from (["'])\.\/([a-z]+)\1/g,'from "/$2.js"'));
});
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(async()=>{
  const {Fixture}=await import('/fixture.js');window.app=new Fixture();
  const rows=[
   {conditionKey:'inside',conditionFromDate:'2026-02-01',conditionToDate:'2026-02-10'},
   {conditionKey:'boundary',conditionFromDate:'2025-01-01',conditionToDate:'2026-01-01'},
   {conditionKey:'open',conditionFromDate:'2025-01-01',conditionToDate:null},
   {conditionKey:'sentinel',conditionFromDate:'2025-01-01',conditionToDate:'9999-12-31'},
   {conditionKey:'past',conditionFromDate:'2025-01-01',conditionToDate:'2025-12-31'},
   {conditionKey:'future',conditionFromDate:'2027-01-01',conditionToDate:null},
   {conditionKey:'invalid',conditionFromDate:'bad',conditionToDate:null},
  ];
  window.mockPost=async(_,payload)=>payload.spName==='scp.list_member_condition'?rows:[];
  await app.showReferenceCollections({domain:'MEMBER',subjectId:'M'});
  const check=(ok,msg)=>{if(!ok)throw Error(msg)};
  const manager=app._rmgr,filter=manager.sets.get('conditions').filter;
  check(manager.getFilterableSetKeys().includes('conditions'),'conditions can filter');
  const apply=async criteria=>{const original=filter.open;filter.open=async()=>({criteria,applyToAll:true});try{await manager.requestFilter('conditions')}finally{filter.open=original}};
  await apply({startDate:'2026-01-01',endDate:'2026-12-31'});
  check(manager.getView('conditions').records.map(r=>r.conditionKey).join()==='inside,boundary,open,sentinel','overlap/boundary/open-ended');
  check(document.querySelector('.clct-tab[data-tab-key="conditions"]').textContent.includes('4 of 7'),'tab count');
  await apply({startDate:'2026-01-01',endDate:'2026-12-31',diagnosis:['DX'],serviceCode:['S'],provider:['P'],vendor:['V']});
  check(manager.getView('conditions').visibleCount===4,'other criteria ignored');
  await apply({diagnosis:['DX'],serviceCode:['S'],provider:['P']});check(manager.getView('conditions').visibleCount===7,'non-date-only shows all');
  await apply({startDate:'2028-01-01',endDate:'2028-12-31'});check(manager.getView('conditions').records.map(r=>r.conditionKey).join()==='open,sentinel,future','future/open semantics');
  manager.clearFilter('conditions');check(manager.getView('conditions').visibleCount===7,'clear restores all');
  window.pending=manager.requestFilter('conditions');
 });
 await page.getByRole('dialog').waitFor({state:'visible'});await page.getByLabel('From',{exact:true}).fill('2026-01-01');await page.getByLabel('Through',{exact:true}).fill('2026-12-31');await page.getByRole('button',{name:'Apply',exact:true}).click();await page.evaluate(async()=>{await pending;if(app._rmgr.getView('conditions').visibleCount!==4)throw Error('native UI date filtering')});
 assert.deepEqual(errors,[]);console.log('PASS: actual '+controller+' conditions overlap, inclusive boundary, null/sentinel end, future/invalid dates, unrelated criteria, clear, counts, and native date UI.');
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
