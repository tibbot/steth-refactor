// Run with Node and Playwright available through NODE_PATH.
// CORE_ROOT must point to the existing core-service checkout (read-only).
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const core = process.env.CORE_ROOT;
if (!core) throw new Error('Set CORE_ROOT to the core-service checkout.');
const ts = require(path.join(core, 'node_modules/typescript'));

const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/javascript');
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') {
        res.setHeader('Content-Type', 'text/html');
        return res.end('<!doctype html><title>Detail tests</title><div id="host"></div>');
    }
    if (url.pathname === '/core-service/') {
        return res.end("export { Detl } from '/core/detl.js';");
    }
    if (url.pathname.startsWith('/core/')) {
        const name = path.basename(url.pathname).replace(/\.js$/, '');
        const file = path.join(core, 'src/js', `${name}.ts`);
        return res.end(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
            compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
        }).outputText);
    }
    const file = path.join(root, url.pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
        res.statusCode = 404;
        return res.end();
    }
    res.end(fs.readFileSync(file, 'utf8').replaceAll(
        'http://localhost/core-service/', '/core-service/'));
});

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const url = `http://127.0.0.1:${server.address().port}`;
        await page.goto(url);
        const result = await page.evaluate(async () => {
            const { Detail } = await import('/wwwroot/js/modules/detail.js');
            const { Detl } = await import('/core-service/');
            const host = document.getElementById('host');
            const calls = [], choices = [];
            let clearCount = 0;
            const check = (test, message) => { if (!test) throw new Error(message); };
            const deferred = () => {
                let resolve;
                const promise = new Promise(r => { resolve = r; });
                return { resolve, promise };
            };
            const buildSnip = () => {
                const fragment = document.createDocumentFragment();
                const fields = ['CLAIMNO', 'AUTHNO', 'CSINO', 'member_full_name',
                    'missing', 'place_of_service', 'incident_ctc_relation',
                    'diagnoses', 'services', 'notes', 'inpatient', 'references',
                    'relatedIncidents', 'processingStatus', 'duplicates', 'claimReferences'];
                for (const field of fields) {
                    const slot = document.createElement('div');
                    slot.dataset.bind = field;
                    slot.dataset.label = field;
                    fragment.appendChild(slot);
                }
                return fragment;
            };
            const standard = async (handler, payload) => {
                calls.push({ handler, payload });
                const id = payload.parameters[0].Value;
                if (handler === 'TableSQL') {
                    return `<table id="${payload.htmlTable}"><thead><tr><th>Value</th></tr></thead><tbody><tr><td>${id}</td></tr></tbody></table>`;
                }
                return [{ CLAIMNO: id, AUTHNO: id, CSINO: id, member_full_name: 'Example Member',
                    place_of_service: '<span title="11">Office</span>', extra: 'not in layout' }];
            };
            let post = standard;
            const detail = new Detail({ host, buildSnip, View: Detl,
                post: (...args) => post(...args),
                onChoose: value => choices.push(value), onClear: () => ++clearCount });
            check(await detail.show({ type: 'claim', id: 'C1' }), 'Claim should display');
            check(calls.length === 8, 'Claim header and seven supporting tables');
            check(calls[0].payload.parameters[0].Key === '@p_CLAIMNO', 'SQL parameter casing');
            check(host.querySelectorAll('table').length === 7, 'Render one-row supporting tables');
            check(host.querySelector('[data-bind="missing"]').textContent === '', 'Missing field stays empty');
            const firstButton = host.querySelector('.detl__btn--choose');
            firstButton.click();
            check(choices[0].id === 'C1' && choices[0].type === 'Claim', 'Captured choice identity');
            check(host.querySelector('.detl--collapsed'), 'Choose collapses');
            host.querySelector('.detl__btn--clear').click();
            check(!host.firstChild, 'Clear removes display');
            firstButton.click();
            check(choices.length === 1, 'Detached old callback must be inert');

            calls.length = 0;
            await detail.show({ type: 'authorization', id: 'A1' });
            check(calls.length === 8, 'Authorization header and seven supporting tables');
            const scalar = host.querySelector('[data-bind="place_of_service"]');
            check(scalar.textContent === 'Office' && scalar.title === '11', 'Preserve SQL span text and tooltip');
            check(!scalar.querySelector('span'), 'Do not bind SQL scalar as executable HTML');
            await detail.show({ type: 'incident', id: 'I1' });
            check(!host.querySelector('.detl__btn--choose'), 'Incidents cannot be chosen');
            host.querySelector('.detl__btn--close').click();
            check(!host.firstChild, 'Close removes display');

            const pending = deferred();
            post = (handler, payload) => payload.parameters[0].Value === 'OLD' ? pending.promise : standard(handler, payload);
            const older = detail.show({ type: 'claim', id: 'OLD' });
            check(!host.querySelector('.detl__btn--choose'), 'Loading record cannot be chosen');
            await detail.show({ type: 'claim', id: 'NEW' });
            pending.resolve([{ CLAIMNO: 'OLD' }]);
            check(await older === false, 'Older header discarded');
            host.querySelector('.detl__btn--choose').click();
            check(choices.at(-1).id === 'NEW', 'New display choice remains authoritative');

            const tables = deferred(), tablesStarted = deferred();
            post = (handler, payload) => {
                if (handler === 'TableSQL') { tablesStarted.resolve(); return tables.promise; }
                return standard(handler, payload);
            };
            const loading = detail.show({ type: 'claim', id: 'CLOSE' });
            await tablesStarted.promise;
            detail.clear();
            tables.resolve('');
            check(await loading === false && !host.firstChild, 'Clear invalidates section retrieval');

            post = async () => [{ CLAIMNO: 'WRONG' }];
            check(await detail.show({ type: 'claim', id: 'C2' }) === false, 'Reject mismatched header');
            check(host.querySelector('[role="alert"]') && !host.querySelector('.detl__btn--choose'), 'Failure cannot be chosen');
            post = standard;
            host.querySelector('button').click();
            while (host.querySelector('[role="status"]')) await new Promise(resolve => setTimeout(resolve, 0));
            check(host.querySelector('[data-bind="CLAIMNO"]').textContent === 'C2', 'Retry recovers the failed record');

            post = (handler, payload) => handler === 'TableSQL'
                ? Promise.resolve('<table><thead><tr><th>Value</th></tr></thead><tbody></tbody></table>')
                : standard(handler, payload);
            check(await detail.show({ type: 'claim', id: 'EMPTY' }), 'Empty supporting sections are valid');
            check(!host.querySelector('table') && host.querySelector('[data-bind="services"]').textContent === '', 'Empty table leaves slot empty');
            let rejected = false;
            try { await detail.show({ type: 'condition', id: 'X' }); } catch { rejected = true; }
            check(rejected && host.querySelector('[data-bind="CLAIMNO"]').textContent === 'EMPTY', 'Unsupported view preserves current display');

            const buildGate = deferred(), buildStarted = deferred();
            class SlowView extends Detl {
                async build() { buildStarted.resolve(); await buildGate.promise; await super.build(); }
            }
            detail.destroy();
            const slow = new Detail({ host, buildSnip, post: standard, View: SlowView });
            const building = slow.show({ type: 'claim', id: 'BUILD' });
            await buildStarted.promise;
            slow.destroy();
            buildGate.resolve();
            check(await building === false && !host.firstChild, 'Destroy invalidates Core build');
            return { passed: true, clearCount };
        });
        assert.equal(result.passed, true);
        assert.deepEqual(errors, []);
        console.log('PASS: SQL mappings, full sections, empty slots, scalar tooltips, choice identity, non-choosable incidents, stale header/section/build responses, failure and recovery.');
    } finally {
        await browser.close();
        server.close();
    }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
