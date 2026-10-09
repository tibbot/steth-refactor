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
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();const errors=[],failedRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failedRequests.push(r.url()));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(async()=>{
  const {Fixture}=await import('/fixture.js');window.app=new Fixture();window.calls=[];
  const data={
   'scp.list_member_claim':[{CLAIMNO:'C1',serviceFromDate:'2026-02-01',serviceThroughDate:'2026-02-10'},{CLAIMNO:'C2',serviceFromDate:'2026-02-01',serviceThroughDate:'2026-02-10'},{CLAIMNO:'C3',serviceFromDate:'2025-02-01',serviceThroughDate:'2025-02-10'}],
   'scp.list_member_authorization':[{AUTHNO:'A1',requestDate:'2026-02-01',expirationDate:'2026-02-10'}],
   'scp.list_member_incident':Array.from({length:7},(_,i)=>({CSINO:'I'+(i+1),openDate:i===3?'2025-02-01':'2026-02-01',closeDate:i===3?'2025-02-10':null})),
   'scp.list_member_artifact_diagnosis_index':[{artifactType:'CLAIM',artifactId:'C1',diagnosisCode:'D',diagnosisDescription:'Diagnosis D'},{artifactType:'CLAIM',artifactId:'C2',diagnosisCode:'D',diagnosisDescription:'Diagnosis D'},{artifactType:'CLAIM',artifactId:'C3',diagnosisCode:'D',diagnosisDescription:'Diagnosis D'},{artifactType:'AUTHORIZATION',artifactId:'A1',diagnosisCode:'E',diagnosisDescription:'Diagnosis E'}],
   'scp.list_member_artifact_service_index':[{artifactType:'CLAIM',artifactId:'C1',serviceCode:'S',serviceDescription:'Service S'},{artifactType:'CLAIM',artifactId:'C2',serviceCode:'T',serviceDescription:'Service T'},{artifactType:'CLAIM',artifactId:'C3',serviceCode:'S',serviceDescription:'Service S'},{artifactType:'AUTHORIZATION',artifactId:'A1',serviceCode:'S',serviceDescription:'Service S'}],
   'scp.list_member_artifact_provider_index':[{artifactType:'CLAIM',artifactId:'C1',providerKeyId:'Q',providerName:'Artifact Provider'},{artifactType:'CLAIM',artifactId:'C2',providerKeyId:'P',providerName:'Primary Provider'},{artifactType:'AUTHORIZATION',artifactId:'A1',providerKeyId:'Q',providerName:'Artifact Provider'}],
   'scp.list_member_incident_related_artifact_index':[{CSINO:'I1',artifactType:'CLAIM',artifactId:'C1'},{CSINO:'I1',artifactType:'CLAIM',artifactId:'C1'},{CSINO:'I2',artifactType:'CLAIM',artifactId:'C2'},{CSINO:'I4',artifactType:'CLAIM',artifactId:'C1'},{CSINO:'I5',artifactType:'AUTHORIZATION',artifactId:'A1'},{CSINO:'I6',artifactType:'CLAIM',artifactId:'C2'},{CSINO:'I6',artifactType:'AUTHORIZATION',artifactId:'A1'},{CSINO:'I7',artifactType:'CLAIM',artifactId:'C3'},{CSINO:'I3',artifactType:'UNKNOWN',artifactId:'C1'}],
   'scp.list_member_incident_provider_index':[{CSINO:'I1',professionalType:'PROVIDER',professionalId:'P',professionalRole:'CUSTOMER'},{CSINO:'I1',professionalType:'VENDOR',professionalId:'V',professionalRole:'REFERENCE'},{CSINO:'I2',professionalType:'PROVIDER',professionalId:'P',professionalRole:'REFERENCE'},{CSINO:'I3',professionalType:'PROVIDER',professionalId:'P',professionalRole:'CUSTOMER'},{CSINO:'I4',professionalType:'PROVIDER',professionalId:'P',professionalRole:'CUSTOMER'},{CSINO:'I5',professionalType:'PROVIDER',professionalId:'Q',professionalRole:'REFERENCE'},{CSINO:'I5',professionalType:'VENDOR',professionalId:'V',professionalRole:'CUSTOMER'},{CSINO:'I6',professionalType:'PROVIDER',professionalId:'P',professionalRole:'REFERENCE'},{CSINO:'I6',professionalType:'VENDOR',professionalId:'V',professionalRole:'CUSTOMER'},{CSINO:'I7',professionalType:'PROVIDER',professionalId:'P',professionalRole:'REFERENCE'}],
  };
  window.mockPost=async(handler,payload)=>{calls.push(payload);if(payload.spName.includes('related_artifact')&&window.failIndex)throw Error('index failed');return data[payload.spName]||[];};
  await app.showReferenceCollections({domain:'MEMBER',subjectId:'member-A'});
  window.ids=()=>app._rmgr.getView('incidents').records.map(r=>r.CSINO).join();
 });
 const apply=async criteria=>{
  await page.evaluate(()=>{window.pending=app._rmgr.requestFilter('incidents').then(()=>({ok:true}),e=>({ok:false,message:e.message}));});
  await page.getByRole('dialog').waitFor({state:'visible'});
  await page.evaluate(criteria=>{
   const inputs=document.querySelectorAll('.fltr__date');inputs[0].value=criteria.startDate||'';inputs[0].dispatchEvent(new Event('input'));inputs[1].value=criteria.endDate||'';inputs[1].dispatchEvent(new Event('input'));
   const concepts={Diagnosis:'diagnosis','Service Code':'serviceCode',Provider:'provider',Vendor:'vendor'};
   for(const group of document.querySelectorAll('.fltr__group')){
    const concept=concepts[group.querySelector('legend').textContent];
    for(const checkbox of group.querySelectorAll('input[type=checkbox]')){
     const label=checkbox.getAttribute('aria-label');const values=criteria[concept]||[];
     const selected=values.some(value=>label===value||label.startsWith(value+' —')||label.endsWith(' · '+value));
     if(checkbox.checked!==selected)checkbox.click();
    }
   }
  },criteria);
  await page.getByRole('button',{name:'Apply',exact:true}).click();return page.evaluate(()=>pending);
 };
 const expect=async(expected,message)=>assert.equal(await page.evaluate(()=>ids()),expected,message);
 await page.evaluate(async()=>{
  const Core=await import('/core.js'),{createMemberContract}=await import('/contracts/member-contract.js');
  const contract=createMemberContract(),guid='12345678-abcd-1234-abcd-123456789abc';
  const direct=contract.sets.incidents.filters.provider.values({professionalType:'PROVIDER',professionalId:guid.toUpperCase(),professionalRole:'REFERENCE'});
  const artifact=contract.sets.claims.filters.provider.values({providerKeyId:guid});
  if(direct.value!==artifact.value)throw Error('GUID identity parity');
  const supported=Core.Rmgr.supportsRelatedFilters;delete Core.Rmgr.supportsRelatedFilters;
  let rejected=false;try{contract.createFilter({setKey:'incidents',label:'Incidents',definitions:{}})}catch(error){rejected=error.message.includes('Update Core service')}finally{Core.Rmgr.supportsRelatedFilters=supported}
  if(!rejected)throw Error('Old Core must fail explicitly');
 });
 const dates={startDate:'2026-01-01',endDate:'2026-12-31'};
 assert.equal(await page.evaluate(()=>calls.filter(p=>p.spName.endsWith('_index')).length),0,'primary load is index-free');
 await apply(dates);await expect('I1,I2,I3,I5,I6,I7','own dates preserve unlinked');
 assert.equal(await page.evaluate(()=>calls.filter(p=>p.spName.includes('related_artifact')).length),0,'date-only does not load association');
 await apply({...dates,diagnosis:['D']});await expect('I1,I2,I6','typed diagnosis links and target dates');
 await apply({...dates,serviceCode:['S']});await expect('I1,I5,I6','service links');
 await apply({...dates,diagnosis:['E'],serviceCode:['T']});await expect('','zero qualifying artifacts means zero incidents');
 await apply({...dates,diagnosis:['D'],serviceCode:['S']});await expect('I1','dx and service must qualify the same linked artifact');
 await apply({...dates,diagnosis:['D'],serviceCode:['S'],provider:['P']});await expect('I1','direct provider differs from linked artifact provider');
 assert.equal(await page.evaluate(()=>app._rmgr.getView('claims').visibleCount),0,'linked projection does not require target provider');
 assert.match(await page.locator('.clct-tab[data-tab-key="incidents"]').innerText(),/1 of 7/,'visible count updated');
 await apply({...dates,provider:['P']});await expect('I1,I2,I3,I6,I7','both customer/reference direct provider roles');
 await apply({...dates,vendor:['V']});await expect('I1,I5,I6','both direct vendor roles');
 await apply({...dates,serviceCode:['S'],vendor:['V']});await expect('I1,I5,I6','service AND direct vendor');
 await apply({...dates,provider:['P'],vendor:['V']});await expect('I1,I6','provider AND vendor can occupy different roles');
 await apply(dates);await expect('I1,I2,I3,I5,I6,I7','removing secondary selections restores unlinked');
 assert.equal(await page.evaluate(()=>calls.filter(p=>p.spName.includes('related_artifact')).length),1,'relationship load cached per member');
 assert.equal(await page.evaluate(()=>calls.filter(p=>p.spName.includes('incident_provider_index')).length),1,'direct professional load cached');
 await page.evaluate(()=>app._rmgr.clearFilter('incidents'));await expect('I1,I2,I3,I4,I5,I6,I7','clear');
 await page.evaluate(async()=>{await app.showReferenceCollections({domain:'MEMBER',subjectId:'member-B'});window.failIndex=true;});
 await apply(dates);const failed=await apply({...dates,diagnosis:['D']});assert(!failed.ok);await expect('I1,I2,I3,I5,I6,I7','failed index preserves date view');
 await page.evaluate(()=>{window.failIndex=false;});await apply({...dates,diagnosis:['D']});await expect('I1,I2,I6','same-member retry');
 await page.setViewportSize({width:390,height:844});await apply({...dates,vendor:['V']});await expect('I1,I5,I6','narrow-screen filtering');
 assert(await page.evaluate(()=>calls.every(p=>p.parameters[0].Key==='@p_MEMB_KEYID'&&p.parameters[0].Type==='varchar')),'member index transport parity');
 assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);console.log('PASS: actual '+controller+' collections/member contract, dates then typed dx/service links, direct provider/vendor roles, no cross-artifact mixing, counts, lazy/cache, clear/retry/member replacement, mobile UI.');
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
