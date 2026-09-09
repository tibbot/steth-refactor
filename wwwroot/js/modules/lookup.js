// @ts-nocheck
/**
 * Stethoscope | lookup
 * ---------------------------------------
 * Description : class for CSI
 * Author      : wogi
 * Converted   : 2025-11-23
 * © 2025 tibbot, inc. all rights reserved
 */



import * as Core from 'http://localhost/core-service/';
console.log('Stethoscope Core ID:', Core.CORE_INSTANCE_ID);



export class Lookup {
    constructor({ snip, lookupLibrary }) {
        this.Snip = snip;
    }

    /**
     * CASE 1: user typed a code.
     * Returns { result: 1, code, name } on success, { result: 0 } on failure.
     * Shows the invalid-term modal on failure.
     */
    resolveCode({ array, raw, label }) {
        const trimmed = (raw || '').trim();
        if (!trimmed) return { result: 0 };

        const items = Array.isArray(array) ? array : [];
        // Assuming items = [ [code, name], ... ]
        const match = items.find(([code]) => String(code) === trimmed);

        if (!match) {
            this._showInvalid({ label, code: trimmed });
            return { result: 0 };
        }

        const [code, name] = match;

        return {
            result: 1,
            code,
            name,
            record: { code, name }, // can expand later (e.g. full row)
        };
    }

    _showInvalid({ label, code }) {
        const snip = Core.buildSnip('msg');
        const msg = `Invalid ${label.toLowerCase()} code: "${code}".`;
        Core.displayAsyncModal?.(snip, msg);
    }


    // CASE 2: user clicked the picker button.
    // `array` is expected to be [ [code, name], [code, name], ... ]
    // returns { result: 1, code, name } or { result: 0 }
    choose({ array, label, header } = {}) {
        const list = Array.isArray(array) ? array : [];
        if (!list.length) {
            return Promise.resolve({ result: 0 });
        }

        const effectiveLabel = label || 'Value';
        const title = header || `Choose ${effectiveLabel}`;
        const names = list.map(row => row[1]);

        return new Promise((resolve) => {
            // 1. Build fragment: <h2> + <select id="lookupDrop">
            const frag = document.createDocumentFragment();

            const container = document.createElement('div');

            const h2 = document.createElement('h2');
            h2.className = 'modl-header';
            h2.textContent = title;
            container.appendChild(h2);

            const select = document.createElement('select');
            select.id = 'lookupDrop';
            select.className = 'inp';
            container.appendChild(select);

            frag.appendChild(container);

            // 2. Show modal using Core's chrome
            Core.drawModal(frag, '400px');

            // Now #lookupDrop is in the real DOM, so buildSelect can see it
            Core.buildSelect('lookupDrop', names, true); // no empty option

            // 3. Resolve immediately on selection (no explicit cancel)
            const finalize = () => {
                const selectedName = select.value || '';

                // Close modal
                if (Core.dismissModal) {
                    Core.dismissModal();
                }

                if (!selectedName) {
                    resolve({ result: 0 });
                    return;
                }

                const match = list.find(row => row[1] === selectedName);
                const code = match ? String(match[0]) : '';

                resolve({
                    result: 1,
                    code,
                    name: selectedName,
                });
            };

            // Old behavior: return as soon as they pick something
            select.addEventListener('change', finalize, { once: true });
        });
    }
}
