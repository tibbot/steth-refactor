import * as Core from 'http://localhost/core-service/';
import { getDetailContract } from './contracts/detail-contracts.js';

/** Application artifact retrieval and lifecycle, using Core Detl's existing API.
 * The host belongs exclusively to this instance. Snips remain application-owned.
 */
export class Detail {
    constructor({ host, buildSnip = Core.buildSnip, post = Core.post,
        View = Core.Detl, onChoose = () => {}, onClear = () => {} }) {
        if (!host) throw new Error('Detail requires a host.');
        this.host = host;
        this.buildSnip = buildSnip;
        this.post = post;
        this.View = View;
        this.onChoose = onChoose;
        this.onClear = onClear;
        this.generation = 0;
        this.view = null;
        this.destroyed = false;
    }

    /** Returns true when displayed, false if superseded or retrieval failed.
     * Configuration errors reject before replacing the current display.
     */
    async show({ type, id }) {
        if (this.destroyed) throw new Error('Detail has been destroyed.');
        const contract = getDetailContract(type);
        const recordId = String(id ?? '').trim();
        if (!recordId) throw new Error('Detail requires a record ID.');
        const snippet = this.buildSnip(contract.snip);
        if (!snippet || !snippet.querySelector('[data-bind]')) {
            throw new Error(`Detail snippet "${contract.snip}" is missing or has no bindings.`);
        }

        this.clear();
        const generation = this.generation;
        const current = () => !this.destroyed && generation === this.generation;
        const identity = Object.freeze({ type: contract.label, id: recordId });
        this._message(`Loading ${contract.label.toLowerCase()}…`);
        let view;

        try {
            const header = this._header(await this.post('ParameterSQL', {
                spName: contract.procedure,
                parameters: this._parameters(contract.parameter, recordId),
            }), contract, recordId);
            if (!current()) return false;

            // Complete all section requests before allowing this record to be chosen.
            const sections = await Promise.all(contract.tables.map(async section => {
                const value = await this.post('TableSQL', {
                    spName: section.procedure,
                    htmlTable: section.tableId,
                    parameters: this._parameters(section.parameter, recordId),
                });
                return [section.key, this._table(value, section.procedure)];
            }));
            if (!current()) return false;

            const bindings = { ...header };
            const titles = new Map();
            for (const key of contract.htmlFields) {
                if (header[key] == null) continue;
                // These specific SQL projections return span/title markup. Preserve
                // its text and tooltip without enabling HTML in Core scalar binding.
                const parsed = new DOMParser().parseFromString(String(header[key]), 'text/html');
                bindings[key] = parsed.body.textContent ?? '';
                const title = parsed.querySelector('[title]')?.getAttribute('title');
                if (title) titles.set(key, title);
            }
            for (const [key, value] of sections) bindings[key] = value;

            // A fresh, detached shell belongs to this request only. Core's build()
            // may finish after clear/show/destroy; it cannot then touch the live host.
            const shell = document.createElement('div');
            shell.className = 'detl';
            shell.innerHTML = '<div class="detl__hdr"><span class="detl__icon"></span></div><div class="detl__data"></div>';
            view = new this.View({
                host: shell,
                blueprint: {
                    sp: contract.procedure,
                    params: () => [{ key: contract.parameter, value: recordId, type: 'varchar' }],
                    contentSnipId: contract.snip,
                    title: () => contract.label,
                    canChoose: contract.canChoose,
                    canClearAfterChoose: true,
                    canClose: true,
                },
                ctx: { rowId: recordId, tabKey: String(type).toLowerCase(), tabLabel: contract.label },
                io: {
                    buildSnip: () => snippet,
                    postParam: async () => [bindings],
                },
                callbacks: {
                    onChoose: () => {
                        if (current() && contract.canChoose) this.onChoose(identity);
                    },
                    onClear: () => { if (current()) this.clear(); },
                    onClose: () => { if (current()) this.clear(); },
                },
            });
            await view.build();
            if (!current()) {
                view.destroy();
                return false;
            }
            shell.querySelectorAll('[data-bind]').forEach(slot => {
                const title = titles.get(slot.getAttribute('data-bind'));
                if (title) slot.setAttribute('title', title);
            });
            this.view = view;
            this.host.replaceChildren(shell);
            return true;
        } catch (error) {
            view?.destroy();
            if (!current()) return false;
            this._message(`Unable to load ${contract.label.toLowerCase()} detail.`, true);
            const retry = document.createElement('button');
            retry.type = 'button';
            retry.textContent = 'Retry';
            retry.addEventListener('click', () => {
                if (current()) void this.show({ type, id: recordId });
            }, { once: true });
            this.host.appendChild(retry);
            console.error('[Detail] Retrieval or rendering failed', contract.procedure, error);
            return false;
        }
    }

    clear() {
        ++this.generation;
        this.view?.destroy();
        this.view = null;
        this.host.replaceChildren();
        this.onClear();
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.clear();
    }

    _parameters(key, id) {
        return [{ Key: key, Value: id, Type: 'varchar' }];
    }

    _header(result, contract, id) {
        const rows = Array.isArray(result) ? result : result?.rows;
        if (!Array.isArray(rows) || rows.length !== 1 || !rows[0] ||
            String(rows[0][contract.idField] ?? '').trim() !== id) {
            throw new Error(`${contract.procedure} did not return exactly one matching record.`);
        }
        return rows[0];
    }

    _table(result, procedure) {
        // Core.post represents an empty response as ''. A header-only table also
        // represents an empty section; leave the slot empty for CSS suppression.
        if (result === '') return '';
        if (typeof result !== 'string') throw new Error(`${procedure} did not return table HTML.`);
        const parsed = new DOMParser().parseFromString(result, 'text/html');
        const table = parsed.querySelector('table');
        if (!table) throw new Error(`${procedure} did not return a table.`);
        const rows = table.tBodies[0]?.rows;
        return rows?.length ? table.outerHTML : '';
    }

    _message(text, failed = false) {
        const message = document.createElement('p');
        message.setAttribute('role', failed ? 'alert' : 'status');
        message.textContent = text;
        this.host.replaceChildren(message);
    }
}
