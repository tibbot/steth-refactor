// @ts-nocheck
/**
 * Stethoscope | search
 * ---------------------------------------
 * Description : Search + Peek helper for CSI
 * Author      : wogi (with refactor assistance)
 * Converted   : 2025-10-02
 * Refactored  : 2025-12-11
 * © 2025 tibbot, inc. all rights reserved
 */

import * as Core from 'http://localhost/core-service/';
console.log('Stethoscope Core ID (Search):', Core.CORE_INSTANCE_ID);

/**
 * Search
 * -----
 *
 * Usage:
 *   const search = new Search({ snip: Snip, searchMap });
 *
 *   // Quick, term-based lookup
 *   const peekResult = await search.peek({ term: 'smith', domain: 'MEMBER' });
 *
 *   // Full dialog-based search
 *   const searchResult = await search.search({ domain: 'MEMBER' });
 *
 * searchMap shape (per domain):
 *   {
 *     domain: 'MEMBER',            // required, case-insensitive
 *     label: 'Member',             // friendly label for messaging
 *     peekProc: 'scp.peek_member', // optional, for term-based peek
 *     searchProc: 'scp.search_member', // required for full search
 *     searchSnipId: 'msx',         // snip id for the search dialog
 *     pickerSnipId: 'pkr',         // optional, defaults to 'pkr'
 *     tableId: 'search-result-table' // optional override for result table id
 *   }
 */
export class Search {
    constructor({ snip, searchMap }) {
        this.Snip = snip;
        this.domains = {};

        (searchMap || []).forEach((cfg) => {
            const key = (cfg.domain || '').toUpperCase();
            if (!key) return;

            this.domains[key] = {
                domain: key,
                label: cfg.label || key,
                peekType: cfg.peekType || key.toLowerCase(), // <-- new
                searchProc: cfg.search || cfg.searchProc,
                pickerSnipId: cfg.pickerSnipId || 'pkr',
                searchSnipId: cfg.searchSnipId || 'search-dialog',
                tableId: cfg.tableId || 'search-result-table',
            };
        });
    }

    // Resolve domain config
    _getDomainCfg(domain) {
        if (!domain) return null;
        return this.domains[String(domain).toUpperCase()] || null;
    }

    // --------------------------------------------------
    // 1. PEEK: term + domain
    // --------------------------------------------------
    async peek({ term, domain }) {
        const cfg = this._getDomainCfg(domain);
        if (!cfg) return { result: 0 };

        const trimmed = (term || '').trim();
        if (!trimmed) return { result: 0 };

        // Always use scp.get_peek with two params:
        // @p_peek_type: 'member' | 'provider' | 'vendor'
        // @p_search_string: user-entered id/term
        const rows = await this._callProc('scp.get_peek', {
            peek_type: cfg.peekType,
            search_string: trimmed,
        });

        if (!rows || !rows.length) {
            const snip = Core.buildSnip('msg');
            const msg = `No ${cfg.label.toLowerCase()} found for "${trimmed}".`;
            Core.displayAsyncModal?.(snip, msg);
            return { result: 0 };
        }

        if (rows.length === 1) {
            return { result: 1, rows, selected: rows[0] };
        }

        const selected = await this._presentPicker(cfg, rows, {
            header: `${cfg.label} matches for "${trimmed}"`,
            allowQueryAgain: true,
        });

        if (selected === '__query_again__') {
            return this.search({ domain: cfg.domain });
        }

        if (!selected) return { result: 0 };

        return { result: 1, rows, selected };
    }


    // --------------------------------------------------
    // 2. SEARCH: full dialog-based search (msx/psx/vsx/hsx)
    // --------------------------------------------------
    async search({ domain }) {
        const cfg = this._getDomainCfg(domain);
        if (!cfg || !cfg.searchProc) return { result: 0 };

        // Loop until user either:
        //  - cancels the dialog, or
        //  - finds rows and finishes via the picker
        // This gives them agency to adjust criteria after a miss.
        // eslint-disable-next-line no-constant-condition
        while (true) {
            // 1. Show domain-specific search dialog (msx, psx, vsx, hsx...)
            const query = await this._presentSearchDialog(cfg);

            // User cancelled out of the dialog → exit search
            if (!query) {
                return { result: 0 };
            }

            // 2. Call backend
            const rows = await this._callProc(cfg.searchProc, {
                ...query,
                domain: cfg.domain,
            });

            if (!rows || !rows.length) {
                // No hits: keep them in the search experience
                // and give immediate feedback, instead of dumping
                // them back into the main UI.
                const snip = Core.buildSnip('msg');
                const msg = `No ${cfg.label.toLowerCase()} records found. Try refining your search.`;
                await Core.displayAsyncModal?.(snip, msg);

                // Loop back to the dialog for another attempt
                continue;
            }

            // 3. We have rows → universal picker flow (pkr)
            const selected = await this._presentPicker(cfg, rows, {
                header: `Choose ${cfg.label}`,
                allowQueryAgain: true,
            });

            if (selected === '__query_again__') {
                // User hit Start Over in pkr → re-enter the loop
                // (back to the search dialog with fresh criteria)
                continue;
            }

            // User cancelled from picker → treat as no selection
            if (!selected) {
                return { result: 0 };
            }

            // Success path: user chose a row
            return {
                result: 1,
                rows,
                selected,
            };
        }
    }

    // --------------------------------------------------
    // Backend helper (ParameterSQL by default)
    // --------------------------------------------------
    async _callProc(procName, params = {}) {
        // Generic, defensive ParameterSQL payload builder.
        // You can customize this per-domain by adjusting how parameters
        // are derived from `params`.
        const parameters = [];

        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return;
            parameters.push({
                Key: `@p_${key}`,
                Value: value,
                Type: 'varchar', // adjust per param as needed
            });
        });

        const payload = {
            spName: procName,
            parameters,
        };

        try {
            const result = await Core.post('ParameterSQL', payload);

            // If the backend returns an array, assume that is the rowset.
            if (Array.isArray(result)) return result;

            // Fallbacks in case the adapter wraps rows.
            if (result && Array.isArray(result.rows)) return result.rows;

            return [];
        } catch (err) {
            console.error('[Search] _callProc error', procName, err);
            return [];
        }
    }

    // --------------------------------------------------
    // Dialog: read `qry-*` fields from msx / psx / vsx / hsx
    // --------------------------------------------------
    async _presentSearchDialog(cfg) {
        const frag = Core.buildSnip(cfg.searchSnipId || 'search-dialog');

        return new Promise((resolve) => {
            if (!frag) {
                console.warn('[Search] No search snip found for', cfg.searchSnipId);
                resolve(null);
                return;
            }

            // Inject dialog into modal
            Core.drawModal(frag, '480px');

            const modal = document.querySelector('.modl-window') || document;

            const searchBtn = modal.querySelector('#search-btn');
            const cancelBtn = modal.querySelector('#cancel-btn');

            const done = (value) => {
                Core.dismissModal?.();
                resolve(value);
            };

            if (cancelBtn) {
                cancelBtn.addEventListener(
                    'click',
                    () => done(null),
                    { once: true },
                );
            }

            if (!searchBtn) return;

            const handleSearch = () => {
                // Collect all inputs/selects whose id starts with "qry-"
                const fields = modal.querySelectorAll(
                    'input[id^="qry-"], select[id^="qry-"]',
                );

                const query = {};
                let nonEmptyCount = 0;

                fields.forEach((el) => {
                    const id = el.id || '';
                    if (!id.startsWith('qry-')) return;

                    const raw = (el instanceof HTMLInputElement || el instanceof HTMLSelectElement)
                        ? el.value
                        : (el.textContent || '');

                    const value = (raw || '').trim();
                    if (!value) return;

                    nonEmptyCount += 1;

                    // Example: "qry-last-name" → "last_name"
                    const key = id
                        .replace(/^qry-/, '')
                        .replace(/-/g, '_');

                    query[key] = value;
                });

                if (!nonEmptyCount) {
                    // No criteria – you *could* show a lightweight message here.
                    console.warn('[Search] No search criteria provided.');
                    return;
                }

                done(query);
            };

            searchBtn.addEventListener('click', handleSearch, { once: true });

            // Optional: allow Enter to trigger search
            modal.addEventListener(
                'keydown',
                (evt) => {
                    if (evt.key === 'Enter') {
                        evt.preventDefault();
                        handleSearch();
                    }
                },
                { once: true },
            );
        });
    }

    // --------------------------------------------------
    // Picker: universal pkr-based table picker
    // --------------------------------------------------
    async _presentPicker(cfg, rows, options = {}) {
        const headerText = options.header || `Choose ${cfg.label}`;
        const allowQueryAgain = !!options.allowQueryAgain;

        if (!rows || !rows.length) return null;

        const frag = Core.buildSnip(cfg.pickerSnipId || 'pkr');

        return new Promise((resolve) => {
            if (!frag) {
                console.warn('[Search] picker snip not found:', cfg.pickerSnipId || 'pkr');
                resolve(null);
                return;
            }

            Core.drawModal(frag, '800px');

            const modal = document.querySelector('.modl-window') || document;

            // Header
            const hdrEl = modal.querySelector('#search-header');
            if (hdrEl) hdrEl.textContent = headerText;

            // Result container
            const container = modal.querySelector('#search-container');
            if (!container) {
                console.warn('[Search] #search-container not found in picker snip.');
                resolve(null);
                return;
            }

            // Render table into container
            const { table, keys } = this._renderResultsTable(container, rows, cfg);

            const tableId = table.id;

            const finalize = (value) => {
                Core.dismissModal?.();
                resolve(value);
            };

            // Row selection – prefer Core.addTrListener if available
            if (tableId && typeof Core.addTrListener === 'function') {
                Core.addTrListener(tableId, 'click', (rowEl) => {
                    const idx = rowEl.rowIndex - 1; // account for header row
                    if (Number.isNaN(idx) || idx < 0 || idx >= rows.length) {
                        console.warn('[Search] _presentPicker: invalid row index', idx);
                        return;
                    }
                    const chosen = rows[idx];
                    finalize(chosen);
                });
            } else {
                table.addEventListener(
                    'click',
                    (evt) => {
                        const tr = evt.target.closest('tr');
                        if (!tr || !tr.parentElement) return;

                        const idx = tr.rowIndex - 1;
                        if (Number.isNaN(idx) || idx < 0 || idx >= rows.length) return;

                        const chosen = rows[idx];
                        finalize(chosen);
                    },
                    { once: true },
                );
            }

            // Start Over / Search Again button
            const startOverBtn = modal.querySelector('#start-over');
            if (startOverBtn) {
                if (!allowQueryAgain) {
                    // For peek flows where you *don’t* want recursion
                    startOverBtn.style.display = 'none';
                } else {
                    startOverBtn.addEventListener(
                        'click',
                        () => finalize('__query_again__'),
                        { once: true },
                    );
                }
            }

            // Cancel
            const cancelBtn = modal.querySelector('#cancel-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener(
                    'click',
                    () => finalize(null),
                    { once: true },
                );
            }
        });
    }

    // --------------------------------------------------
    // Render a simple table inside #search-container
    // --------------------------------------------------
    _renderResultsTable(container, rows, cfg) {
        const tableId = cfg.tableId || 'search-result-table';

        const table = document.createElement('table');
        table.id = tableId;
        table.classList.add('srch-tbl');

        const keys = Object.keys(rows[0] || {});
        const [keyField, ...displayKeys] = keys;

        const thead = table.createTHead();
        const headerRow = thead.insertRow();

        displayKeys.forEach((key) => {
            const th = document.createElement('th');
            th.textContent = key;
            headerRow.appendChild(th);
        });

        const tbody = table.createTBody();

        rows.forEach((row) => {
            const tr = tbody.insertRow();

            // Historical result-set contract:
            // first return column identifies the row; it is not display data.
            tr.id = String(row[keyField] ?? '');

            displayKeys.forEach((key) => {
                const td = tr.insertCell();
                const value = row[key];
                td.textContent = value == null ? '' : String(value);
            });
        });

        container.innerHTML = '';
        container.appendChild(table);

        return { table, keys: displayKeys };
    }
}
