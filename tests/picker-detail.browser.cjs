// Run with Node and Playwright available through NODE_PATH. Uses Edge and synthetic records.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  res.setHeader('Content-Type', 'text/javascript');
  if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); return res.end('<!doctype html><title>Picker detail tests</title>'); }
  if (pathname === '/core-service/') return res.end(`
    export const post = (...args) => window.post(...args);
    export const buildSnip = () => { const el = document.createElement('div'); el.innerHTML = '<h2 id="search-header"></h2><div id="search-container"></div><button id="cancel-btn">Cancel</button><button id="start-over">Start Over</button>'; return el; };
    export const drawModal = el => { dismissModal(); el.className = 'modl-window'; document.body.append(el); };
    export const dismissModal = () => document.querySelector('.modl-window')?.remove();
    export const displayAsyncModal = (_snip, text) => window.messages.push(text);
  ` + (process.env.PICKER_FALLBACK ? '' : `export const addTrListener = (id, event, callback) => document.getElementById(id).querySelectorAll('tbody tr').forEach(row => row.addEventListener(event, () => callback(row)));`));
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
  res.end(fs.readFileSync(file, 'utf8').replaceAll('http://localhost/core-service/', '/core-service/'));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage();
    const errors = [], failed = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failed.push(request.url()));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const result = await page.evaluate(async () => {
      const { Search } = await import('/wwwroot/js/modules/search.js');
      const { Incident } = await import('/wwwroot/js/modules/incident.js');
      const check = (value, message) => { if (!value) throw Error(message); };
      const search = new Search({ searchMap: ['MEMBER','PROVIDER','VENDOR'].map(domain => ({ domain, searchProc: 'search' })) });
      window.messages = [];
      const cfg = search._getDomainCfg('MEMBER');
      const rows = [{ RECORD_KEY: 'key-1', member_id: 'display-1' }, { RECORD_KEY: 'key-2', member_id: 'display-2' }];
      let pending = search._presentPicker(cfg, rows);
      document.querySelector('th').click(); // must not consume fallback listener
      document.querySelectorAll('tbody tr')[1].click();
      check(await pending === 'key-2', 'Picker must return record key, not row or display ID');
      pending = search._presentPicker(cfg, rows);
      document.getElementById('cancel-btn').click();
      check(await pending === null, 'Cancel must return null');
      search._callProc = async () => [rows[0]];
      check((await search.peek({ term: 'x', domain: 'MEMBER' })).selected === 'key-1', 'Single peek returns key');
      check(!document.querySelector('.modl-window'), 'Single peek bypasses picker');
      search._callProc = async () => [];
      check((await search.peek({ term: 'x', domain: 'MEMBER' })).result === 0, 'Empty peek');
      search._callProc = async () => rows;
      pending = search.peek({ term: 'x', domain: 'MEMBER' });
      await new Promise(resolve => setTimeout(resolve, 0));
      document.querySelectorAll('tbody tr')[0].click();
      check((await pending).selected === 'key-1', 'Multi-row peek returns key');
      search._presentSearchDialog = async () => ({ name: 'x' });
      pending = search.search({ domain: 'MEMBER' });
      await new Promise(resolve => setTimeout(resolve, 0));
      document.getElementById('start-over').click();
      await new Promise(resolve => setTimeout(resolve, 0));
      document.querySelectorAll('tbody tr')[1].click();
      check((await pending).selected === 'key-2', 'Start Over stays internal');
      const subject = Object.create(Incident.prototype);
      let domain = 'MEMBER';
      subject._getActiveDomain = () => domain;
      subject.syncNotepadField = () => {};
      const setup = ctx => {
        document.body.innerHTML = `<input id="${ctx}-id" value="search"><div id="npd"><div data-area="${ctx}">
          <div data-field="${ctx}.memberNumber" data-bind="member_id"></div>
          <div data-field="${ctx}.memberLastName" data-bind="member_last_name"></div>
          <div data-field="${ctx}.memberAddress"></div>
          <div data-field="${ctx}.providerFullName"></div><div data-field="${ctx}.vendorFullName"></div>
          <div data-field="${ctx}.note">keep note</div></div></div>`;
      };
      const calls = [];
      window.post = async (handler, payload) => {
        calls.push({ handler, ...payload });
        return [{ member_id: 'M-123', last_name: 'Detail Name', address: 'Full address' }];
      };
      setup('customer');
      subject.search = { peek: async () => ({ result: 1, selected: 'internal-key' }) };
      await subject.peekSubject(document.getElementById('customer-id'));
      check(calls[0].spName === 'scp.get_member_detail' && calls[0].parameters[0].Key === '@p_MEMB_KEYID' && calls[0].parameters[0].Value === 'internal-key', 'Member payload uses key');
      check(document.getElementById('customer-id').value === 'M-123', 'Display ID comes from detail');
      check(document.querySelector('[data-bind="member_last_name"]').textContent === 'Detail Name', 'Customer aliases bind');
      check(document.querySelector('[data-field$=".memberAddress"]').textContent === 'Full address', 'Reference-style fields bind');
      check(document.querySelector('[data-field$=".note"]').textContent === 'keep note', 'Notes preserved');
      for (const [d, procedure, parameter, row, expected] of [
        ['PROVIDER','scp.get_provider_detail','@p_PROV_KEYID',{provider_tax_id:'TAX-P',full_name:'Full Provider'},'TAX-P'],
        ['VENDOR','scp.get_vendor_detail','@p_VEN_KEYID',{vendor_tax_id:'TAX-V',vendor_id:'V-1',full_name:'Full Vendor'},'TAX-V']
      ]) {
        setup('reference'); domain = d;
        window.post = async (_handler, payload) => { check(payload.spName === procedure && payload.parameters[0].Key === parameter && payload.parameters[0].Value === 'key', d + ' payload'); return { rows: [row] }; };
        subject.search.search = async () => ({result:1, selected:'key'});
        await subject.drawSearch(d, 'reference');
        check(document.getElementById('reference-id').value === expected, d + ' displayed ID');
        check(document.querySelector('[data-field$=".' + d.toLowerCase() + 'FullName"]').textContent === row.full_name, d + ' detail display');
      }
      let count = 0;
      window.post = async () => { count++; return []; };
      subject.search.search = async () => ({result:0});
      await subject.drawSearch(domain,'reference');
      check(count === 0, 'Cancel does not fetch detail');
      const original = document.getElementById('reference-id').value;
      for (const response of [[], [{}], [{},{}], null]) {
        window.post = async () => response;
        await subject._applySearchSelection('reference', domain, 'key');
        check(document.getElementById('reference-id').value === original, 'Invalid detail preserves display');
      }
      window.post = async () => { throw Error('synthetic network failure'); };
      await subject._applySearchSelection('reference', domain, 'key');
      check(window.messages.length >= 4, 'Failures reported');
      let release;
      window.post = () => new Promise(resolve => release = resolve);
      pending = subject._applySearchSelection('reference', domain, 'old');
      subject._beginSubjectRequest('reference'); // newer lookup, including cancel
      release([{vendor_tax_id:'STALE',full_name:'Stale'}]);
      await pending;
      check(document.getElementById('reference-id').value === original, 'Late detail ignored');
      return 'PASS: picker key/cancel/start-over, single and multi peek, all domain detail payloads, customer/reference binding, failure and stale response';
    });
    assert.deepEqual(errors, []); assert.deepEqual(failed, []);
    console.log(result);
  } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
