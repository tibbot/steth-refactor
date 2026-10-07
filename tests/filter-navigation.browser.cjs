const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const {chromium}=require('playwright');
const core=process.env.CORE_ROOT;
if(!core)throw Error('Set CORE_ROOT to core-service.');
const ts=require(path.join(core,'node_modules/typescript'));
const server=http.createServer((req,res)=>{
    if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/core-vars.css"><link rel="stylesheet" href="/css/core.css"><link rel="stylesheet" href="/css/modl.css"><link rel="stylesheet" href="/css/fltr.css"><button id="opener">Open</button><dialog id="modl"><div id="modl-hdr"></div><div id="modl-body"></div><div id="modl-ftr"></div></dialog>');}
    if(req.url==='/favicon.ico'){res.statusCode=204;return res.end();}
    if(/^\/css\/[a-z-]+\.css$/.test(req.url)){res.setHeader('Content-Type','text/css');return res.end(fs.readFileSync(path.join(core,'public',req.url),'utf8'));}
    res.setHeader('Content-Type','text/javascript');
    const name=req.url.slice(1).replace(/\.js$/,'');
    const file=path.join(core,'src/js',name+'.ts');
    if(!/^[a-z]+$/.test(name)||!fs.existsSync(file)){res.statusCode=404;return res.end();}
    res.end(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText.replace(/from (["'])\.\/([a-z]+)\1/g,'from "/$2.js"'));
});
(async()=>{
    let browser;
    try{
        await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
        browser=await chromium.launch({channel:'msedge',headless:true});
        const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.goto('http://127.0.0.1:'+server.address().port);
        await page.evaluate(async()=>{
            const {Fltr}=await import('/fltr.js'),{Rmgr}=await import('/rmgr.js');
            const check=(ok,message)=>{if(!ok)throw Error(message)};
            const records=[
                {id:'span',start:'2021-06-01',end:'2023-02-01'},
                {id:'open',start:'2024-05-01',end:null},
                {id:'sentinel',start:'2020-01-01',end:'9999-12-12'},
                {id:'future',start:'2030-01-01',end:'2031-02-01'},
                {id:'invalid',start:'bad',end:'2025-01-01'},
                {id:'endOnly',start:null,end:'2017-01-01'},
                {id:'unknown',start:null,end:'9999-12-12'},
                {id:'empty',start:null,end:null},
                {id:'futureOpen',start:'2034-01-01',end:null},
                {id:'today',start:'2026-12-31',end:'2026-12-31'},
                {id:'tomorrow',start:'2027-01-01',end:'2027-01-01'},
            ];
            const date={concept:'dateRange',kind:'dateRange',label:'Dates',source:'primary',parentId:r=>r.id,start:r=>r.start,end:r=>r.end,matchMode:'overlap',openEndYear:9999};
            const definitions={dateRange:date};
            for(const [concept,label]of [['diagnosis','Diagnosis'],['service','Service'],['provider','Provider'],['taxId','Tax ID'],['npi','NPI'],['specialty','Specialty']]){
                definitions[concept]={concept,label,kind:'multi',source:'primary',parentId:r=>r.id,values:()=>({value:'one',label:'Example '+label})};
            }
            const now=()=>new Date(2026,11,31,12);
            const sources={primary:records,secondary:{}};
            const filter=new Fltr({setKey:'claims',label:'Claims',definitions,now});
            const expected=[2034,2031,2030,2027,2026,2025,2024,2023,2022,2021,2020,2017];
            check(JSON.stringify(filter.deriveYears(sources))===JSON.stringify(expected),'year coverage/open endpoint cap');
            filter.applyLocal({startDate:'2026-12-31'});
            check(filter.getState().criteria.endDate==='2026-12-31','implicit Through not resolved');
            const matched=filter.match(sources).parentIds;
            check(matched.has('open')&&matched.has('sentinel')&&matched.has('today')&&!matched.has('tomorrow'),'through today boundary');
            filter.applyLocal({startDate:'2030-07-01',endDate:'2030-07-01'});
            check(filter.match(sources).parentIds.has('open')&&filter.match(sources).parentIds.has('sentinel'),'future matching lost open-ended records');
            filter.applyLocal({});check(filter.match(sources).parentIds===null,'blank dates impose a restriction');
            window.sources=sources;window.filter=filter;
            const contract={key:'family',createFilter:args=>new Fltr({...args,now}),sets:{
                claims:{key:'claims',label:'Claims',loadPrimary:async()=>records,recordId:r=>r.id,allowFilter:true,filters:definitions},
                eligibility:{key:'eligibility',label:'Eligibility',loadPrimary:async()=>[{id:'elig',start:'2028-01-01',end:'2029-12-31'}],recordId:r=>r.id,allowFilter:true,filters:{dateRange:date}},
            }};
            const manager=new Rmgr(contract);manager.initialize();await manager.load('member');window.manager=manager;
            document.getElementById('opener').focus();window.pending=manager.requestFilter('eligibility');
        });
        await page.getByRole('dialog',{name:'Filter Results'}).waitFor({state:'visible'});
        const nav=page.getByRole('navigation',{name:'Filter sections'});
        assert.equal(await nav.getByRole('button').count(),7);
        const preset=page.getByRole('combobox',{name:'Year / Current'});
        const options=await preset.locator('option').evaluateAll(options=>options.map(option=>option.value));
        assert(options.includes('2028')&&options.includes('2029')&&!options.includes('9999'));
        await preset.selectOption('2022');
        assert.equal(await page.getByLabel('From',{exact:true}).inputValue(),'2022-01-01');
        assert.equal(await page.getByLabel('Through',{exact:true}).inputValue(),'2022-12-31');
        assert.equal(await page.evaluate(()=>manager.hasActiveFilter()),false);
        await page.getByLabel('Through',{exact:true}).fill('2022-10-01');assert.equal(await preset.inputValue(),'custom');
        const headerTop=await page.locator('#modl-hdr').evaluate(el=>el.getBoundingClientRect().top);
        await nav.getByRole('button',{name:'Specialty',exact:true}).click();
        await page.waitForFunction(()=>document.getElementById('modl-body').scrollTop>0);
        assert.equal(await page.locator('#modl-hdr').evaluate(el=>el.getBoundingClientRect().top),headerTop);
        assert.equal(await page.evaluate(()=>document.activeElement.querySelector('legend')?.textContent),'Specialty');
        await nav.getByRole('button',{name:'Dates',exact:true}).click();await preset.selectOption('current');
        assert.equal(await page.getByLabel('From',{exact:true}).inputValue(),'2026-12-31');
        assert.equal(await page.getByLabel('Through',{exact:true}).inputValue(),'2026-12-31');
        await page.getByRole('button',{name:'Apply',exact:true}).click();
        await page.evaluate(async()=>{await pending;const criteria=manager.getFilterCriteria();if(criteria.startDate!=='2026-12-31'||criteria.endDate!=='2026-12-31')throw Error('Current criteria');});
        await page.evaluate(()=>{window.pending=manager.requestFilter('claims')});
        await page.getByRole('dialog').waitFor({state:'visible'});await preset.selectOption('all');
        await page.getByLabel('From',{exact:true}).fill('2026-01-01');
        await page.getByRole('button',{name:'Apply',exact:true}).click();
        await page.evaluate(async()=>{await pending;if(manager.getFilterCriteria().endDate!=='2026-12-31')throw Error('blank Through normalization');window.pending=manager.viewFilter('claims')});
        await page.getByRole('dialog',{name:'Current Filter'}).waitFor({state:'visible'});
        assert.equal(await page.getByLabel('Through',{exact:true}).inputValue(),'2026-12-31');
        assert.equal(await page.getByLabel('Through',{exact:true}).isDisabled(),true);
        assert.equal(await page.getByRole('navigation',{name:'Filter sections'}).getByRole('button').count(),1);
        await page.getByRole('button',{name:'Close',exact:true}).click();await page.waitForFunction(()=>!manager.filterRequestPending);
        await page.evaluate(()=>{window.pending=manager.requestFilter('claims')});
        await page.getByRole('dialog').waitFor({state:'visible'});await preset.selectOption('all');
        await page.getByRole('button',{name:'Apply',exact:true}).click();
        await page.evaluate(async()=>{await pending;if(manager.hasActiveFilter())throw Error('all dates did not clear dates');window.pending=manager.requestFilter('claims')});
        await page.getByRole('dialog').waitFor({state:'visible'});await preset.selectOption('2021');await page.keyboard.press('Escape');
        await page.evaluate(async()=>{await pending;if(manager.hasActiveFilter())throw Error('cancel committed preset');window.pending=manager.requestFilter('claims')});
        await page.getByRole('dialog').waitFor({state:'visible'});
        await page.getByLabel('From',{exact:true}).fill('2030-01-01');await page.getByRole('button',{name:'Apply',exact:true}).click();
        assert.match(await page.getByRole('alert').innerText(),/From must be/);
        assert.equal(await page.getByLabel('Through',{exact:true}).inputValue(),'');
        await page.getByLabel('From',{exact:true}).fill('2021-01-01');
        await page.setViewportSize({width:390,height:844});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        assert.equal(await nav.getByRole('button',{name:'NPI',exact:true}).isVisible(),true);
        const geometry=await page.evaluate(()=>({header:document.getElementById('modl-hdr').getBoundingClientRect().top,footer:document.getElementById('modl-ftr').getBoundingClientRect().bottom,height:innerHeight}));
        assert(geometry.header>=0&&geometry.footer<=geometry.height);
        await page.screenshot({path:path.join(process.env.TEMP,'filter-navigation-narrow.png'),fullPage:true});
        await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.evaluate(async()=>{await pending;manager.destroy()});
        assert.deepEqual(errors,[]);
        console.log('PASS: shared available years, spanning/open/sentinel/future intervals, Current/today boundaries, editable presets, Apply/Cancel, exact effective Through, section navigation, and narrow layout');
    }finally{await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
