const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const core = process.env.CORE_ROOT;
if (!core) throw Error('Set CORE_ROOT to the core-service checkout.');
const ts = require(path.join(core, 'node_modules/typescript'));
const source = fs.readFileSync(path.join(root, 'wwwroot/js/modules/incident.js'), 'utf8');
const render = source.slice(source.indexOf('    _refreshCollectionViews(contract) {'), source.indexOf('    // -----------------------------------------', source.indexOf('    _refreshCollectionViews(contract) {')));
const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/javascript');
    if (/^\/css\/[a-z-]+\.css$/.test(req.url)) { res.setHeader('Content-Type','text/css'); return res.end(fs.readFileSync(path.join(core,'public',req.url),'utf8')); }
    if (req.url === '/favicon.ico') { res.statusCode = 204; return res.end(); }
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); return res.end('<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><link rel=stylesheet href=/css/core-vars.css><link rel=stylesheet href=/css/core.css><link rel=stylesheet href=/css/modl.css><link rel=stylesheet href=/css/fltr.css><button id="opener">Open filter</button><main class="clct"></main><dialog id="modl"><div id="modl-hdr"></div><div id="modl-body"></div><div id="modl-ftr"></div></dialog>'); }
    if (req.url === '/fixture.js') return res.end("import * as Core from '/core.js'; export class Fixture {" + render + '}');
    if (req.url === '/core.js') return res.end("export * from '/fltr.js';export * from '/rmgr.js';export * from '/clct.js';export * from '/tblm.js';export const post = (...args) => window.mockPost(...args);");
    if (req.url === '/member.js') return res.end(fs.readFileSync(path.join(root, 'wwwroot/js/modules/contracts/member-contract.js'), 'utf8').replaceAll('http://localhost/core-service/', '/core.js'));
    const name = req.url.slice(1).replace(/\.js$/, '');
    const file = path.join(core, 'src/js', name + '.ts');
    if (!/^[a-z]+$/.test(name) || !fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
    res.end(output.replace(/from (["'])\.\/([a-z]+)\1/g, 'from "/$2.js"'));
});
(async () => {
    let browser;
    try {
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        browser = await chromium.launch({ channel: 'msedge', headless: true });
        const page = await browser.newPage(); page.on('console', msg => { if (msg.type()==='error') console.error(msg.text()); }); page.setDefaultTimeout(5000); const errors = []; page.on('pageerror', e => { errors.push(e.message); console.error('PAGE:', e.message); });
        await page.goto('http://127.0.0.1:' + server.address().port);
        await page.evaluate(async () => {
            const { Fltr, Rmgr, Clct } = await import('/core.js');
            const { Fixture } = await import('/fixture.js');
            const { createMemberContract } = await import('/member.js');
            const check = (ok, message) => { if (!ok) throw Error(message); };
            const primary = [{ id: '1', start: '2026-01-01', end: '2026-01-31' }, { id: '2', start: '2026-02-01', end: null }, { id: '3', start: 'bad', end: '2026-03-01' }];
            const diagnosis = [{ id: '1', code: 'D1', name: 'First' }, { id: '2', code: 'D2', name: 'Second' }, { id: 'orphan', code: 'XX', name: 'Orphan' }];
            const providers = [{ id: '1', code: 'P1' }, { id: '2', code: 'P2' }];
            const definitions = {
                dateRange: { concept: 'dateRange', kind: 'dateRange', label: 'Dates', source: 'primary', parentId: r => r.id, start: r => r.start, end: r => r.end, matchMode: 'overlap' },
                diagnosis: { concept: 'diagnosis', kind: 'multi', label: 'Diagnosis', source: 'diagnoses', parentId: r => r.id, values: r => ({ value: r.code, label: r.name }) },
                provider: { concept: 'provider', kind: 'multi', label: 'Provider', source: 'providers', parentId: r => r.id, values: r => r.code },
            };
            const sources = { primary, secondary: { diagnoses: diagnosis, providers } };
            const filter = new Fltr({ setKey: 'claims', label: 'Claims', definitions });
            const snapshot = JSON.stringify(sources);
            check(filter.match(sources).parentIds === null, 'inactive sentinel');
            check(filter.deriveOptions(sources).get('diagnosis').length === 2, 'ignore orphan options');
            filter.applyLocal({ diagnosis: ['D1', 'D2'], provider: ['P1'] });
            check([...filter.match(sources).parentIds].join() === '1', 'OR within, AND across independent child sources');
            filter.applyLocal({ diagnosis: ['missing'] }); check(filter.match(sources).parentIds.size === 0, 'zero matches sentinel');
            filter.applyLocal({ startDate: '2026-01-31', endDate: '2026-01-31' }); check([...filter.match(sources).parentIds].join() === '1', 'inclusive dates');
            filter.applyLocal({ startDate: '2026-04-01' }); check([...filter.match(sources).parentIds].join() === '2', 'open interval and invalid date exclusion');
            check(JSON.stringify(sources) === snapshot, 'inputs immutable');
            const calls = { support: 0 };
            const set = (key, defs, secondary = {}) => ({ key, label: key, loadPrimary: async () => primary, recordId: r => r.id, allowFilter: true, filters: defs, secondary, metadata: { tableId: key + '-table', columns: [{ key: 'id', label: 'ID', sortable: true }] } });
            const contract = { key: 'family', createFilter: args => new Fltr(args), sets: {
                claims: set('claims', definitions, { diagnoses: { load: async () => { calls.support++; return diagnosis; } }, providers: { load: async () => providers } }),
                auths: set('auths', definitions, { diagnoses: { load: async () => diagnosis }, providers: { load: async () => providers } }),
                eligibility: set('eligibility', { dateRange: definitions.dateRange }),
                conditions: { ...set('conditions', {}), allowFilter: false },
            } };
            const manager = new Rmgr(contract); manager.initialize(); await manager.load('member-A');
            const fixture = new Fixture(); fixture._rmgr = manager;
            const collection = new Clct({ host: document.querySelector('.clct'), blueprint: { activeTabKey: 'eligibility', tabs: Object.keys(contract.sets).map(key => ({ key, label: key, panel: { kind: 'table', tableId: key + '-table', rowCountInTab: true, selectable: false } })) }, callbacks: { onViewFilter: ({tabKey}) => manager.viewFilter(tabKey) } });
            fixture._clct = collection; await collection.build();
            manager.subscribe(({change}) => { if (change.reason === 'view-updated') fixture._refreshCollectionViews(contract); });
            fixture._refreshCollectionViews(contract);
            window.manager = manager; window.contract = contract; window.calls = calls;
            document.getElementById('opener').focus();
            window.pending = manager.requestFilter('eligibility').catch(e => { console.error(e); throw e; });
            check(typeof createMemberContract().createFilter === 'function', 'application factory wired');
        });
        await page.getByRole('dialog').waitFor({ state: 'visible' });
        await page.getByRole('checkbox', { name: 'First', exact: true }).check();
        await page.getByRole('button', { name: 'Apply', exact: true }).click();
        await page.evaluate(async () => { await window.pending; const counts = Object.fromEntries(manager.getViews().map(v => [v.key, v.visibleCount])); if (JSON.stringify(counts) !== JSON.stringify({ claims: 1, auths: 1, eligibility: 3, conditions: 3 })) throw Error('shared counts: ' + JSON.stringify(counts)); });
        assert.match(await page.locator('.clct-tabs').innerText(), /claims.*1 of 3/s);
        await page.getByRole('button', { name: 'View Filter', exact: true }).click();
        await page.getByRole('checkbox', { name: 'First', exact: true }).waitFor();
        assert.equal(await page.getByRole('checkbox').count(), 1);
        assert.equal(await page.getByRole('checkbox').isDisabled(), true);
        await page.getByRole('button', { name: 'Close', exact: true }).click();
        await page.waitForFunction(() => !manager.filterRequestPending);
        await page.evaluate(() => { window.pending = manager.requestFilter('claims'); });
        await page.getByRole('dialog').waitFor({ state: 'visible' });
        assert.equal(await page.getByRole('checkbox', { name: 'First', exact: true }).isChecked(), true);
        await page.getByRole('searchbox', { name: 'Search Diagnosis' }).fill('second');
        assert.equal(await page.getByRole('checkbox', { name: 'First', exact: true }).isVisible(), false);
        await page.getByRole('checkbox', { name: 'Second', exact: true }).check();
        await page.keyboard.press('Escape');
        await page.evaluate(async () => { await pending; if (manager.getView('claims').visibleCount !== 1 || calls.support !== 1) throw Error('cancel or support cache'); });
        await page.evaluate(() => { window.pending = manager.requestFilter('auths'); });
        await page.getByRole('dialog').waitFor({ state: 'visible' });
        await page.getByRole('checkbox', { name: 'First', exact: true }).uncheck();
        await page.getByRole('checkbox', { name: 'Second', exact: true }).check();
        await page.getByRole('button', { name: 'Apply', exact: true }).click();
        await page.evaluate(async () => { await pending; if (manager.getView('claims').records[0].id !== '2') throw Error('edit shared'); manager.clearFilter('eligibility'); if (manager.getViews().some(v => v.visibleCount !== 3)) throw Error('clear all'); });
        await page.evaluate(() => { window.pending = manager.requestFilter('claims'); });
        await page.getByRole('dialog').waitFor({ state: 'visible' });
        await page.locator('input[type=date]').first().fill('2026-03-01');
        await page.locator('input[type=date]').nth(1).fill('2026-01-01');
        await page.getByRole('button', { name: 'Apply', exact: true }).click();
        assert.match(await page.getByRole('alert').innerText(), /From must/);
        await page.evaluate(async () => { await manager.load('member-B'); await pending; if (manager.hasActiveFilter() || manager.getViews().some(v => v.visibleCount !== 3)) throw Error('stale dialog applied'); });
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await page.evaluate(async () => {
            const { Rmgr } = await import('/core.js');
            const { createMemberContract } = await import('/member.js');
            const calls = [];
            let rejectDiagnosis = false;
            window.mockPost = async (_, payload) => {
                calls.push(payload);
                const sp = payload.spName;
                if (sp.endsWith('_index')) {
                    if (sp.includes('diagnosis') && rejectDiagnosis) throw Error('retryable index failure');
                    return ['CLAIM', 'AUTHORIZATION'].map((artifactType, i) => ({
                        artifactType, artifactId: 'SAME', diagnosisCode: i ? 'AUTH-DX' : 'CLAIM-DX', diagnosisDescription: artifactType,
                        serviceCode: i ? 'AUTH-SVC' : 'CLAIM-SVC', providerKeyId: i ? 'AUTH-PRV' : 'CLAIM-PRV', providerName: artifactType,
                    }));
                }
                if (sp === 'scp.list_member_claim') return [{ CLAIMNO: 'SAME' }];
                if (sp === 'scp.list_member_authorization') return [{ AUTHNO: 'SAME' }];
                return [];
            };
            const contract = createMemberContract();
            const manager = new Rmgr(contract); manager.initialize(); await manager.load('member-A');
            await Promise.all(['claims','authorizations'].map(key => manager.ensureFilterSupport(key)));
            const indexes = calls.filter(call => call.spName.endsWith('_index'));
            if (indexes.length !== 3 || new Set(indexes.map(call => call.spName)).size !== 3) throw Error('indexes were not loaded once');
            for (const key of ['claims','authorizations']) {
                const type = key === 'claims' ? 'CLAIM' : 'AUTHORIZATION';
                const sources = { primary: manager.getPrimary(key), secondary: Object.fromEntries(['diagnoses','services','providers'].map(source => [source, manager.getSecondary(key, source)])) };
                if (Object.values(sources.secondary).some(rows => rows.length !== 1 || rows[0].artifactType !== type)) throw Error('artifact partition');
                const filter = contract.createFilter({ setKey: key, label: key, definitions: contract.sets[key].filters });
                if (filter.deriveOptions(sources).get('diagnosis').length !== 1) throw Error('unified options missing');
                filter.applyLocal({diagnosis:['CLAIM-DX']});
                if (filter.match(sources).parentIds.size !== (key === 'claims' ? 1 : 0)) throw Error('same ID crossed artifact types');
            }
            await manager.load('member-B');
            await Promise.all(['claims','authorizations'].map(key => manager.ensureFilterSupport(key)));
            if (calls.filter(call => call.spName.endsWith('_index')).length !== 6) throw Error('new member reused indexes');
            await manager.load('member-C'); rejectDiagnosis = true;
            const failures = await Promise.allSettled(['claims','authorizations'].map(key => manager.ensureFilterSupport(key)));
            if (failures.some(result => result.status !== 'rejected')) throw Error('shared failure not propagated');
            rejectDiagnosis = false;
            await Promise.all(['claims','authorizations'].map(key => manager.ensureFilterSupport(key)));
            const memberC = calls.filter(call => call.spName.endsWith('_index') && call.parameters[0].Value === 'member-C');
            if (memberC.length !== 4 || memberC.filter(call => call.spName.includes('diagnosis')).length !== 2) throw Error('shared retry/cache');
            manager.destroy();
        });
        await page.evaluate(async () => {
            const { Fltr } = await import('/core.js'); const { createMemberContract } = await import('/member.js');
            const definitions = createMemberContract().sets.claims.filters;
            const sources = { primary: [{CLAIMNO:'1'},{CLAIMNO:'2'}], secondary: { diagnoses: [], services: [], providers: [
                {artifactId:'1',providerKeyId:'P1',providerName:'Alpha Clinic',providerTaxId:'T1',providerNpi:'N1'},
                {artifactId:'1',providerKeyId:'P2',providerName:'Beta Clinic',providerTaxId:'T2',providerNpi:'N2'},
                {artifactId:'2',providerKeyId:'P3',providerName:'Gamma Clinic',providerTaxId:'T1',providerNpi:'N2'},
            ] } };
            const filter = new Fltr({setKey:'claims',label:'Claims',definitions});
            filter.applyLocal({taxId:['T1'],npi:['N2']});
            if ([...filter.match(sources).parentIds].join() !== '2') throw Error('Tax ID and NPI crossed provider rows');
            filter.applyLocal({taxId:['T1','T2'],npi:['N1','N2']});
            if (filter.match(sources).parentIds.size !== 2) throw Error('identifier OR semantics');
            filter.applyLocal({provider:['P1'],taxId:['T1'],npi:['N2']});
            if (filter.match(sources).parentIds.size !== 0) throw Error('provider identity crossed identifier row');
            const options = filter.deriveOptions(sources).get('taxId');
            if (options.find(o=>o.label==='T1').details.providerName.length !== 2) throw Error('identifier names not combined');
            filter.clear(); window.uiFilter = filter; window.uiSources = sources; window.pending = filter.open(sources);
        });
        await page.getByRole('dialog', {name:'Filter Results'}).waitFor({state:'visible'});
        const tax = page.locator('fieldset').filter({has:page.locator('legend', {hasText:/^Tax ID$/})});
        const npi = page.locator('fieldset').filter({has:page.locator('legend', {hasText:/^NPI$/})});
        assert.equal(await tax.getByRole('columnheader', {name:'Tax ID',exact:true}).count(),1);
        await tax.getByRole('row').filter({hasText:'T1'}).click();
        assert.equal(await tax.getByRole('checkbox', {name:'T1',exact:true}).isChecked(),true);
        await tax.getByRole('searchbox').fill('Beta');
        assert.equal(await tax.getByRole('checkbox', {name:'T1',exact:true}).isVisible(),false);
        await tax.getByRole('searchbox').fill('');
        await npi.getByRole('checkbox', {name:'N2',exact:true}).check();
        const desktop = await page.evaluate(() => {
            const dialog=document.getElementById('modl'), buttons=[...document.querySelectorAll('.fltr__actions button')];
            return { overflow:dialog.scrollWidth>dialog.clientWidth, widths:buttons.map(b=>b.getBoundingClientRect().width), padding:parseFloat(getComputedStyle(document.getElementById('modl-body')).paddingLeft) };
        });
        assert.equal(desktop.overflow,false); assert.equal(desktop.widths[0],desktop.widths[1]); assert(desktop.padding>=24);
        await page.mouse.move(0,0);
        await page.screenshot({path:path.join(process.env.TEMP,'steth-filter-desktop.png'),fullPage:true});
        await page.setViewportSize({width:390,height:844});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        await page.screenshot({path:path.join(process.env.TEMP,'steth-filter-narrow.png'),fullPage:true});
        await page.getByRole('button', {name:'Apply',exact:true}).click();
        await page.evaluate(async()=>{ const result=await pending; uiFilter.applyLocal(result.criteria); if ([...uiFilter.match(uiSources).parentIds].join()!=='2') throw Error('table UI identifier matching'); });
        assert.deepEqual(errors, []);
        console.log('PASS: generic matching, source identity, shared dialog/view/edit/clear, counts, cancellation, support caching, invalid dates, member replacement, and app rendering');
    } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
