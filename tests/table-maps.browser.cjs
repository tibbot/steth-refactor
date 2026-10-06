const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),core=process.env.CORE_ROOT;
const ts=require(path.join(core,'node_modules/typescript'));
const source=fs.readFileSync(path.join(root,'wwwroot/js/modules/incident.js'),'utf8');
const slice=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const server=http.createServer((req,res)=>{
res.setHeader('Content-Type','text/javascript');
if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><main></main>');}
if(req.url==='/core-service/')return res.end("export * from '/tblm.js';");
if(['/tblm.js','/frmt.js'].includes(req.url))return res.end(ts.transpileModule(fs.readFileSync(path.join(core,'src/js',req.url.slice(1).replace('.js','.ts')),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText.replaceAll("from './frmt'", "from '/frmt.js'"));if(req.url==='/fixture.js')return res.end("import * as Core from '/core-service/'; export class Fixture {"+slice('    _getRelatedDetail(req) {','    async _fetchRelatedDetail')+slice('    async _renderRelatedDetail(','    // 5) Ancestor')+'}');
if(req.url==='/member.js')return res.end(fs.readFileSync(path.join(root,'wwwroot/js/modules/contracts/member-contract.js'),'utf8').replaceAll('http://localhost/core-service/','/core-service/'));
res.statusCode=404;res.end();});
(async()=>{let browser;try{await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
await page.evaluate(async()=>{
const {Fixture}=await import('/fixture.js');const {createMemberContract}=await import('/member.js');const {buildRecordTable,makeTableSortable}=await import('/core-service/');const check=(x,m)=>{if(!x)throw Error(m)};
const fixture=new Fixture();const maps=fixture._getRelatedDetail({tabKey:'claims'});check(maps.length===7,'claim maps');check(fixture._getRelatedDetail({tabKey:'authorizations'}).length===7,'auth maps');
for(const cfg of [...maps,...fixture._getRelatedDetail({tabKey:'authorizations'}),...fixture._getRelatedDetail({tabKey:'incidents'})]){if(!document.getElementById(cfg.target)){const div=document.createElement('div');div.id=cfg.target;document.querySelector('main').append(div);}}
fixture._fetchRelatedDetail=async cfg=>cfg.tableId==='claimProcedure-table'?[{CLAIMNO:'C1',Date:'01/02/2026',Billed:'$1,000.00',Adj:'<span title="Adjustment">Z</span>'},{CLAIMNO:'C2',Date:'12/31/2025',Billed:'$20.00',Adj:'<span title="Other">A</span>'}]:[];
await fixture._renderRelatedDetail({tabKey:'claims',rowId:'C1'});const table=document.getElementById('claimProcedure-table');check(table.tHead.rows[0].cells[0].textContent==='Claim ID','identity heading');check(table.querySelector('span').title==='Adjustment','mapped html');table.tHead.rows[0].cells[2].click();check(table.tBodies[0].rows[0].cells[2].textContent==='$20.00','mapped numeric sort');table.tHead.rows[0].cells[1].click();check(table.tBodies[0].rows[0].cells[1].textContent==='12/31/2025','mapped date sort');check(document.getElementById('nte-div').textContent==='No notes available.','empty behavior');
const contract=createMemberContract();for(const set of Object.values(contract.sets)){for(const column of set.metadata.columns){check(['text','number','date'].includes(column.sortType),'explicit member sort type');check(!column.format,'no display formatting inference');}}
const claimSet=contract.sets.claims;const claimTable=buildRecordTable([{CLAIMNO:'001',billedAmount:'$1,000.00',dateReceived:'01/02/2026'},{CLAIMNO:'002',billedAmount:'$20.00',dateReceived:'12/31/2025'}],{columns:claimSet.metadata.columns,rowId:claimSet.recordId});makeTableSortable(claimTable);const moneyIndex=claimSet.metadata.columns.findIndex(c=>c.key==='billedAmount');claimTable.tHead.rows[0].cells[moneyIndex].click();check(claimTable.tBodies[0].rows[0].id==='002','collection sorting preserves identity');
});assert.deepEqual(errors,[]);console.log('PASS: actual supporting maps/rendering, column labels, numeric/date sorts, explicit HTML, member contracts, row identity and empty sections');}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
