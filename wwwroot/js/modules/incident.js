// @ts-nocheck
/**
 * Stethoscope | incident
 * ---------------------------------------
 * Description : class for CSI
 * Author      : wogi
 * Converted   : 2025-06-02
 * © 2025 tibbot, inc. all rights reserved
 */

import * as Core from 'http://localhost/core-service/';

import { Lookup } from './lookup.js';
import { Search } from './search.js';
import { createMemberContract } from './contracts/member-contract.js';
import { createProviderContract } from './contracts/provider-contract.js';
import { createVendorContract } from './contracts/vendor-contract.js';
import { IncidentPersistence } from './contracts/persistence-contract.js';

export class Incident {
    constructor({ snip }) {
        this.Snip = snip;
        this.agentId = Core.getCookie('pEL')?.trim() || null;
        this.persistence = new IncidentPersistence({ post: (handler,payload) => Core.post(handler,payload) });
        this._saveInProgress = false;
        this._persistedIncidentId = null;
        this.csmUserId = null;
        this._contactGeneration = 0;

        // Minimal state (no shadow object)
        this.incidentId = null; // == csino
        this.warnThresholdMs = 10 * 60 * 1000;
        this.timerStart = null;
        this.timerHandle = null;
        this._timerStarted = false;
        this.isDirty = false;

        // Delegated listener registry
        this._delegated = [];

        // lookupStore
        this.lookupStore = {};
        this.lookup = new Lookup({ snip: this.Snip, });

        const searchMap = [
            { domain: 'MEMBER', label: 'Member', peekType: 'member', searchProc: 'scp.get_member_search', peekSearchKey: 'member_number', searchSnipId: 'msx' },
            { domain: 'PROVIDER', label: 'Provider', peekType: 'provider', searchProc: 'scp.get_provider_search', peekSearchKey: 'tax_id', searchSnipId: 'psx' },
            { domain: 'VENDOR', label: 'Vendor', peekType: 'vendor', searchProc: 'scp.get_vendor_search', peekSearchKey: 'tax_id', searchSnipId: 'vsx' },
            { domain: 'HEALTHPLAN', label: 'Health Plan', peekType: 'healthplan', searchProc: 'scp.get_healthplan_search', searchSnipId: 'hsx' },
        ];

        this.search = new Search({ snip: this.Snip, searchMap }); 

        this._initReferenceCollectionSystem();

        // Categories map for REFERENCE triad
        this.categories = {
            reference: {
                byType: {},      // typeCode -> { code, label, bySubtype: { subCode -> { code, label } } }
                byCode: {},      // subCode -> [ { typeCode, typeDesc, subCode, subDesc }, ... ]
            },
        };

        // lookup fields
        this.lookupFieldConfig = {
            'ctc-rl': { kind: 'relationship', notepadField: 'contact.relationship', buttonId: 'relation-btn', },
            'res-priority': { kind: 'priority', notepadField: 'resolution.priority', buttonId: 'priority-btn', },
            'res-status': { kind: 'status', notepadField: 'resolution.status', buttonId: 'status-btn', },
            'res-result': { kind: 'result', notepadField: 'resolution.result', buttonId: 'result-btn', },
            'res-action-code': { kind: 'action', notepadField: 'resolution.actionCode', buttonId: 'action-btn', },
            'res-assign': { kind: 'assignTo', notepadField: 'resolution.responsiblePerson', buttonId: 'respper-btn', },
        };

        this.lookupArrayConfig = {
            relationship: { arrName: 'arrRelation', spName: 'scp.get_relation_code', label: 'Relationship', },
            priority: { arrName: 'arrPriority', spName: 'scp.get_priority_code', label: 'Priority', },
            status: { arrName: 'arrStatus', spName: 'scp.get_status_code', label: 'Status', },
            result: { arrName: 'arrResult', spName: 'scp.get_result_code', label: 'Result', },
            action: { arrName: 'arrAction', spName: 'scp.get_action_code', label: 'Action Code', },
            assignTo: { arrName: 'arrRespper', spName: 'scp.get_respper', label: 'Assigned To', },
        };

        this.uiArrays = {
            arrType: 'scp.get_type',
            arrTypeSubType: 'scp.get_type_sub_type',
            arrAction: 'scp.get_action_code',
            //arrContact: 'scp.get_contact_code',
            //arrCustomer: 'scp.get_customer_code',
            //arrReference: 'scp.get_reference_code',
            //arrColors: 'scp.get_color_scheme',
            arrHealthplan: 'scp.get_healthplan_list',
            //arrFonts: 'cor.get_font_scheme',
        };

        // categories map for search
        this.categoryConfig = {
            customer: {
                'Member': { idLabel: 'Member Number', npdField: 'customer.memberNumber', searchType: 'member', },
                'Provider': { idLabel: 'Provider Tax ID', npdField: 'customer.providerTaxId', searchType: 'provider', },
                'Vendor': { idLabel: 'Vendor Tax ID', npdField: 'customer.vendorTaxId', searchType: 'vendor', },
                'Health Plan': { idLabel: 'Health Plan Name', npdField: 'customer.healthplanName', searchType: 'healthplan', },
                'Other': { idLabel: 'Other Description', npdField: 'customer.other', searchType: null, },
            },
            reference: {
                'Member': { idLabel: 'Member Number', npdField: 'reference.memberNumber', searchType: 'member', },
                'Provider': { idLabel: 'Provider Tax ID', npdField: 'reference.providerTaxId', searchType: 'provider', },
                'Vendor': { idLabel: 'Vendor Tax ID', npdField: 'reference.vendorTaxId', searchType: 'vendor', },
                'Other': { idLabel: 'Other Description', npdField: 'reference.other', searchType: null, },
            },
        };

        // Local listener config 
        this.config = {
            listeners: [
                // Contact

                { target: '#ctc-ph', type: 'input', handler: (e) => this._formatPhone(e, 'e') }, // harmless convenience
                { target: '#ctc-fx', type: 'input', handler: (e) => this._formatPhone(e) },

                // Notepad toggle / generic input sync
                { target: '.npd-icon', type: 'click', handler: (e) => this.toggleNotepad(e) },
                { target: '.inp', type: 'change', handler: (e) => this.syncNotepadField(e.target) },

                // Category button bars (determine search context in Customer/Reference)
                { target: '[name="contact.category"]', type: 'change', handler: (e) => this.onCategoryChange(e, 'contact') },
                { target: '[name="customer.category"]', type: 'change', handler: (e) => this.onCategoryChange(e, 'customer') },
                { target: '[name="reference.category"]', type: 'change', handler: (e) => this.onCategoryChange(e, 'reference') },

                // Search and dropdowns
                { target: '#customer-search', type: 'click', handler: () => this.onSearchClick('customer') },
                { target: '#reference-search', type: 'click', handler: () => this.onSearchClick('reference') },

                // Artifact toggles & peeks
                { target: '#customer-id',  type: 'change', handler: (e) => this.peekSubject(e.target) },
                { target: '#reference-id', type: 'change', handler: (e) => this.peekSubject(e.target) },

                // Tabs & actions
                { target: '#reset-btn', type: 'click', handler: (e) => this.confirmClearAll(e) },
                { target: '#save-more-btn', type: 'click', handler: (e) => this.saveAndMore(e) },
                { target: '#save-new-btn', type: 'click', handler: (e) => this.saveAndNew(e) },

                // REFERENCE ONLY triad
                { target: '#ref-type',    type: 'change', handler: (e) => this.onTypeChange(e) },
                { target: '#ref-sub-type', type: 'change', handler: (e) => this.onSubtypeChange(e) },
                { target: '#ref-type-abbr', type: 'change', handler: (e) => this.onSubcodeChange(e) },

                // TEMPORARY NPI
                { target: 'input[name="npi-input"]', type: 'change', handler: (e) => this.onNpiInputChange(e) },
                { target: '#npi-btn', type: 'click', handler: (e) => this.onNpiButtonClick(e) },
            ],
        };
    }

    // ————————————————————————————————————————————
    // Boot
    // ————————————————————————————————————————————

    async init({ incidentId = null } = {}) {
        await this._buildLookupStore();
        await this._initReferenceTriad();

        this._attachListeners();
        this._initLookupBindings();
        this._initResolutionEnsureContact();

        if (incidentId) {
            await this.load(incidentId); // stubbed for now
        } else {
            this._syncHeader();
        }
    }

    async load(incidentId = null) {
        this.incidentId = incidentId;
        this._syncHeader();
    }

    _initLookupBindings() {
        Object.entries(this.lookupFieldConfig).forEach(([inputId, cfg]) => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('change', (e) => {
                    this._onLookupFieldChange(e.target);
                });
            }

            if (cfg.buttonId) {
                const btn = document.getElementById(cfg.buttonId);
                if (btn) {
                    btn.addEventListener('click', () => {
                        this._onLookupButtonClick(inputId);
                    });
                }
            }
        });
    }

    async _buildLookupStore() {
        this.lookupStore = {};

        for (const cfg of Object.values(this.lookupArrayConfig)) {
            const payload = { spName: cfg.spName, parameters: [] };
            const result = await Core.post('ParameterSQL', payload);
            this.lookupStore[cfg.arrName] = Core.buildArray(result, 'single');
        }

        for (const [arrName, spName] of Object.entries(this.uiArrays)) {
            const payload = { spName, parameters: [] };
            const result = await Core.post('ParameterSQL', payload);
            this.lookupStore[arrName] = Core.buildArray(result, 'single');
        }

        this._populateLookupSelects();
    }

    _populateLookupSelects() {
        // Assigned To: arrRespper -> #res-assign
        const assignArr = this.lookupStore.arrRespper || [];
        const assignNames = assignArr.map(row => row[1]);

        if (assignNames.length) {
            Core.buildSelect('res-assign', assignNames, true);
        }
    }

    async _initReferenceTriad() {
        const refCat = this.categories.reference;

        // 1. Load arrTypeSubType into lookupStore if not already present
        let rows = this.lookupStore.arrTypeSubType;
        if (!rows) {
            const payload = { spName: this.uiArrays.arrTypeSubType, parameters: [] };
            const result = await Core.post('ParameterSQL', payload);
            rows = Core.buildArray(result, 'single');
            this.lookupStore.arrTypeSubType = rows;
        }

        // rows: [type_code, type_description, sub_type_code, sub_type_description]
        refCat.byType = {};
        refCat.byCode = {};

        for (const [typeCode, typeDesc, subCode, subDesc] of rows) {
            if (!refCat.byType[typeCode]) {
                refCat.byType[typeCode] = {
                    code: typeCode,
                    label: typeDesc,
                    bySubtype: {},
                };
            }

            const typeEntry = refCat.byType[typeCode];
            if (!typeEntry.bySubtype[subCode]) {
                typeEntry.bySubtype[subCode] = {
                    code: subCode,
                    label: subDesc,
                };
            }

            if (!refCat.byCode[subCode]) {
                refCat.byCode[subCode] = [];
            }
            refCat.byCode[subCode].push({ typeCode, typeDesc, subCode, subDesc });
        }

        // 2. Pre-populate <select id="ref-type"> dynamically
        const typeSel = document.getElementById('ref-type');
        if (typeSel) {
            const typeOptions = Object.values(refCat.byType).map(t => ({
                value: t.code,   // e.g., 'AOR'
                label: t.label,  // e.g., 'Appointment of Representative'
            }));

            // static list pattern: first blank option, then (code, description)
            this._populateSelect(typeSel, typeOptions, { includeBlank: true });
        }
    }

    _attachListeners() {

        const configs = this.config.listeners.map(({ target, type, handler }) => {
            // Wrap original handler to preserve `this` and timer semantics
            const wrapped = (evt) => {
                try {
                    handler.call(this, evt);
                } finally {
                    if (!["save-more-btn", "save-new-btn", "reset-btn"].includes(evt.target?.id)) {
                        void this._ensureContact(evt).catch(error => Core.error?.("[Incident] contact initialization", error));
                    }
                }
            };

            return {
                target,
                event: type,   // Core.attachEventListeners expects `event`
                handler: wrapped,
            };
        });

        Core.attachEventListeners(configs);

    }

    detachListeners() {
        for (const { type, bound } of this._delegated) document.removeEventListener(type, bound);
        this._delegated = [];
    }

    // ————————————————————————————————————————————
    // Validation (Core vldt)
    // ————————————————————————————————————————————

    // ————————————————————————————————————————————
    // Handlers
    // ————————————————————————————————————————————

    onRelationshipChange(e) {
        this.isDirty = true;
        this.syncNotepadField(e.target);
    }

    _onLookupFieldChange(input) {
        if (!input) return;
        this.isDirty = true;

        const fieldCfg = this.lookupFieldConfig[input.id];
        if (!fieldCfg) return;

        const arrayCfg = this.lookupArrayConfig[fieldCfg.kind];
        if (!arrayCfg) return;

        const raw = (input.value || '').trim();
        const arr = this.lookupStore[arrayCfg.arrName] || [];
        const label = arrayCfg.label || fieldCfg.kind;

        // 1) Cleared input: clear close date if this is status
        if (!raw) {
            input.value = '';
            input.dataset.code = '';

            if (input.id === 'res-status') {
                this._updateCloseDateFromStatus(''); // clears it
            }

            this.syncNotepadField(input);
            return;
        }

        if (!arr.length) {
            input.dataset.code = '';
            // No data: just sync input, do not attempt anything
            if (input.id === 'res-status') {
                this._updateCloseDateFromStatus('');
            }
            this.syncNotepadField(input);
            return;
        }

        const result = this.lookup.resolveCode({
            array: arr,
            raw,
            label,
        });

        // 2) Invalid: lookup has already shown error; clear field + close date
        if (!result.result) {
            input.value = '';
            input.dataset.code = '';

            if (input.id === 'res-status') {
                this._updateCloseDateFromStatus('');
            }

            this.syncNotepadField(input);
            return;
        }

        // 3) Valid: standard behavior + close-date rule for status
        input.value = result.name;
        input.dataset.code = result.code;

        if (input.id === 'res-status') {
            this._updateCloseDateFromStatus(result.name);
        }

        this.syncNotepadField(input);
    }

    async _onLookupButtonClick(inputId) {
        this.isDirty = true;

        const fieldCfg = this.lookupFieldConfig[inputId];
        if (!fieldCfg) return;

        const arrayCfg = this.lookupArrayConfig[fieldCfg.kind];
        if (!arrayCfg) return;

        const arr = this.lookupStore[arrayCfg.arrName] || [];
        if (!arr.length) return;

        const result = await this.lookup.choose({
            array: arr,
            label: arrayCfg.label,
            header: `Choose ${arrayCfg.label}`,
        });

        if (!result || !result.result) return;

        const input = document.getElementById(inputId);
        if (!input) return;

        input.value = result.name;
        input.dataset.code = result.code;

        await this._ensureContact({ target: input });

        // Special case: status => update Close Date
        if (inputId === 'res-status') {
            this._updateCloseDateFromStatus(result.name);
        }

        this.syncNotepadField(input);
    }

    _initResolutionEnsureContact() {
        if (this._resolutionEnsureAttached) return;
        this._resolutionEnsureAttached = true;

        const container =
            document.querySelector('#res') ||
            document.querySelector('[data-section="resolution"]');

        if (!container) return;

        // Any CHANGE on a .inp inside Resolution will try to ensure contact
        const handler = (evt) => {
            const target = evt.target;
            if (!(target instanceof HTMLElement)) return;
            if (!target.classList.contains('inp')) return;

            this._ensureContact(evt);
        };

        container.addEventListener('change', handler);
    }

    _updateCloseDateFromStatus(statusName) {
        const npd = document.getElementById('npd');
        if (!npd) return;

        const row = npd.querySelector('[data-field="incident.closeDate"]');
        if (!row) return;

        const name = (statusName || '').trim().toLowerCase();

        if (name === 'close') {
            const now = new Date();
            row.textContent = now.toLocaleDateString();
        } else {
            row.textContent = '';
        }

        // Keep any dynamic labels in sync (same as syncNotepadField does)
        this.resolveDynamicLabels();
    }

    _formatPhone(e, mode) {
        const input = e.target; if (!input) return;
        input.value = Core.prettyTel(input.value, mode === 'e' ? 'e' : undefined);
    }

    toggleNotepad(_e) {
        const wrap = document.querySelector('.wrap');
        const npdSection = document.getElementById('npd');
        const hdnSection = document.getElementById('hdn');
        const icon = document.querySelector('.npd-icon');

        // If any of the key elements are missing, bail quietly.
        if (!wrap || !npdSection || !hdnSection || !icon) return;

        // In the legacy code, "isHidden" meant "was hidden before this click"
        const wasHidden = hdnSection.style.display === 'flex';

        // Toggle visibility: when hidden, show npd / hide hdn; when shown, reverse
        hdnSection.style.display = wasHidden ? 'none' : 'flex';
        npdSection.style.display = wasHidden ? 'flex' : 'none';

        if (!wasHidden) {
            // Notepad is now VISIBLE → remove .dnd from hdn
            hdnSection.classList.remove('dnd');
        } else {
            // Notepad is now HIDDEN → add .dnd to hdn
            hdnSection.classList.add('dnd');
        }

        // - notepad visible   → '2fr 1fr 0px'
        // - notepad collapsed → '2fr 0px 70px'
        wrap.style.gridTemplateColumns = wasHidden ? '2fr 1fr 0px' : '2fr 0px 70px';

        // Toggle icon glyph + title not explicitly necessary - the <div> carries that
        //icon.innerHTML = wasHidden ? '&rarr;' : '& #x1F5D2;& #xFE0F;';        // → vs 🗒️
        //icon.title = wasHidden ? 'Hide the Notepad' : 'Show the Notepad';
    }

    onCategoryChange(e, ctx) {
        this.isDirty = true;

        const el = e.target;
        if (!el) return;

        const value = el.value;  // 'MEMBER', 'PROVIDER', 'SAME', etc.

        // Human-facing label text (prefer the <label>, fall back as needed)
        let categoryLabel = this._getLabelTextForInput(el);
        if (!categoryLabel && value && Core.changeCase) {
            categoryLabel = Core.changeCase(value.toLowerCase(), 'word'); // MEMBER -> Member, etc.
        }

        // CONTACT: show search inputs, focus first name
        if (ctx === 'contact') {
            const blocks = document.querySelectorAll('[data-group="contact-search"]');
            blocks.forEach(div => div.classList.remove('dnd'));

            const fn = document.getElementById('ctc-fn');
            if (fn) fn.focus();

            this._updateCategoryNotepad(ctx, categoryLabel);
            return;
        }

        // CUSTOMER / REFERENCE
        if (ctx === 'customer' || ctx === 'reference') {
            const searchContainer = document.getElementById(`${ctx}-search-container`);
            const searchLabel = document.getElementById(`${ctx}-id-label`);
            const searchButton = document.getElementById(`${ctx}-search`);
            const blocks = document.querySelectorAll(`[data-group="${ctx}-search"]`);

            // Snapshot the chosen radio BEFORE clearing
            const radioName = el.name;
            const radioValue = el.value;

            // Clear relevant sections (content only; radios preserved by clearSection)
            if (ctx === 'customer') {
                this.clearSection(['customer']);
            } else {
                this.clearSection(['reference']);
            }

            // Reassert the chosen radio after clearing (defensive but explicit)
            if (radioName && radioValue) {
                const chosen = document.querySelector(
                    `input[name="${radioName}"][value="${radioValue}"]`
                );
                if (chosen) chosen.checked = true;
            }

            // REFERENCE = SAME special case → delegate and bail
            if (ctx === 'reference' && value === 'SAME') {
                this._resolveSameReference();
                return;
            }

            // ---- Normal category handling using categoryConfig ----
            const cfgByCtx = this.categoryConfig && this.categoryConfig[ctx];
            const cfg = cfgByCtx && cfgByCtx[categoryLabel];

            // Show search controls (customer / reference)
            blocks.forEach(div => div.classList.remove('dnd'));
            if (searchContainer) searchContainer.classList.remove('dnd');

            const idInputId = ctx === 'customer' ? 'customer-id' : 'reference-id';
            const idInput = document.getElementById(idInputId);

            if (cfg) {
                // 1) Label above the ID input
                if (searchLabel) {
                    searchLabel.textContent = cfg.idLabel;
                }

                // 2) Placeholder + npdField + searchType metadata on the ID input
                if (idInput) {
                    idInput.placeholder = cfg.idLabel;
                    idInput.dataset.npdField = cfg.npdField;
                    idInput.dataset.searchType = cfg.searchType || '';
                }

                // 3) Toggle search button (no search for Other)
                if (searchButton) {
                    if (!cfg.searchType) {
                        // "Other" → free-text only, no search
                        searchButton.classList.add('dnd');
                        searchButton.disabled = true;
                    } else {
                        // Valid searchable category
                        searchButton.classList.remove('dnd');
                        searchButton.disabled = false;
                    }
                }
            } else {
                // Fallback: clear label, disable search
                if (searchLabel) {
                    searchLabel.textContent = '';
                }
                if (idInput) {
                    idInput.placeholder = '';
                    idInput.dataset.npdField = '';
                    idInput.dataset.searchType = '';
                }
                if (searchButton) {
                    searchButton.classList.add('dnd');
                    searchButton.disabled = true;
                }
            }

            // Focus the ID input for convenience
            if (idInput) idInput.focus();

            // Notepad: write the selected category label (Member, Provider, etc.)
            this._updateCategoryNotepad(ctx, categoryLabel);
            return;
        }

        // Any other ctx: no-op for now
    }

    _resolveSameReference() {
        const customerCatRadio = document.querySelector(
            'input[name="customer.category"]:checked'
        );
        const customerCategory = customerCatRadio?.value; // 'MEMBER', 'PROVIDER', 'VENDOR', etc.

        const customerIdEl = document.getElementById('customer-id');
        const customerId = customerIdEl?.value?.trim();

        const validCats = ['MEMBER', 'PROVIDER', 'VENDOR'];
        const isValidCategory = validCats.includes(customerCategory || '');

        const refRadios = document.querySelectorAll('input[name="reference.category"]');
        const refSearchContainer = document.getElementById('ref-search-container');
        const refBlocks = document.querySelectorAll('[data-group="reference-search"]');

        if (isValidCategory && customerId) {
            // Find the reference radio with the SAME value as the customer category
            const refRadio = Array.from(refRadios).find(
                (r) => r.value === customerCategory
            );

            if (refRadio) {
                refRadio.checked = true;

                // Copy ID and trigger downstream behavior
                const refId = document.getElementById('reference-id');
                if (refId) {
                    refId.value = customerId;
                    const evt = new Event('change', { bubbles: true });
                    refId.dispatchEvent(evt);
                }

                // Re-run normal reference.category change for the resolved category
                this.onCategoryChange({ target: refRadio }, 'reference');
                return true;
            }

            return false;
        }

        // Failure path: clear SAME and hide reference search
        refRadios.forEach((r) => (r.checked = false));

        const msg = Core.buildSnip('msg');
        Core.displayAsyncModal?.(
            msg,
            'You must select a valid member, provider, or vendor in the Customer section first.'
        );

        refBlocks.forEach((div) => div.classList.add('dnd'));
        if (refSearchContainer) refSearchContainer.classList.add('dnd');

        return false;
    }

    toggleArtifact(_e) {
        document.body.classList.toggle('artifact-open');
    }

    _getActiveDomain(ctx) {
        const container =
            ctx === 'customer'
                ? document.querySelector('#cst')     // or whatever wraps customer radios
                : document.querySelector('#ref');     // reference section

        if (!container) return null;

        const checked = container.querySelector('input[type="radio"]:checked');
        return checked ? checked.value : null; // 'MEMBER' | 'PROVIDER' | 'VENDOR'
    }

    // peekSubject
    async peekSubject(input) {
        if (this._suppressPeek) return;

        const ctx =
            input.id === 'customer-id' ? 'customer' :
                input.id === 'reference-id' ? 'reference' :
                    null;

        if (!ctx) return;

        if (ctx === 'reference') {
            this._clearReferenceSystem();
        }

        const domain = this._getActiveDomain(ctx); // must return 'MEMBER'|'PROVIDER'|'VENDOR'
        if (!domain) return;

        const term = String(input.value ?? '').trim();
        if (!term) return;

        if (domain === 'OTHER') {
            this.syncNotepadField(input);
            return;
        }

        const peekResult = await this.search.peek({ term, domain });

        if (!peekResult || peekResult.result !== 1 || !peekResult.keyId) {
            input.value = '';
            this.syncNotepadField(input);
            return;
        }

        await this._selectSubject(ctx, domain, peekResult.keyId);

    }

    //selectTab(tabId) {
    //    const tabs = document.querySelectorAll('.tab');
    //    tabs.forEach((t) => t.classList.remove('active'));
    //    document.getElementById(tabId)?.classList.add('active');
    //}

    async confirmClearAll(_e) {
        const cfm = Core.buildSnip('cfm');
        //const ok = await Core.displayAsyncModal(cfm, 'Clear all fields?');
        await Core.drawConfirm(cfm, 'Are you sure you want to discard this incident?', () => { this._clearForm(); Core.dismissModal(); }, 'Stethoscope');
        //if (ok) this._clearForm();
    }

    async saveAndMore(_e) { return this._runSave('more'); }
    async saveAndNew(_e) { return this._runSave('new'); }
    async save() { return this._runSave('stay'); }

    async _runSave(next) {
        if (this._saveInProgress) return false;
        this._saveInProgress = true;
        const controls = Array.from(document.querySelectorAll('#save-more-btn, #save-new-btn, #reset-btn'));
        const disabled = controls.map(control => control.disabled);
        controls.forEach(control => { control.disabled = true; });
        const root = document.getElementById('scp');
        const wasInert = root?.inert;
        if (root) root.inert = true;
        const notify = message => Core.displayAsyncModalSettled(Core.buildSnip('msg'), message);
        let persisted = false;
        try {
            if (this._persistedIncidentId !== this.incidentId || !this.incidentId) {
                if (this._contactPromise) await this._contactPromise;
                if (!this.incidentId) await this._ensureContact();
                const payload = this.collect();
                if (!await this.validate(payload)) return false;
                const result = await this.persistence.insert(payload);
                this._persistedIncidentId = this.incidentId;
                persisted = true;
                this.isDirty = false;
                await notify(result.incidentNumber + ' created. ' + result.message);
            }
            if (next === 'more') {
                this.clearSection(['reference', 'resolution']);
                this._clearCategories(['reference']);
                this._resetIncidentNotepad();
                this.incidentId = null;
                this._persistedIncidentId = null;
                this._stopTimer();
                await this._initiateContact();
                if (!this.incidentId) throw new Error('Unable to obtain the next incident number.');
                this.isDirty = false;
            } else if (next === 'new') {
                this._clearForm();
                this._persistedIncidentId = null;
                this._syncHeader();
            }
            return true;
        } catch (error) {
            // Keep the form intact on failure; a confirmed insert is never retried.
            await notify((persisted ? 'The incident was saved, but the next step failed: ' : 'Unable to save the incident: ') + error.message);
            return false;
        } finally {
            if (root) root.inert = wasInert;
            controls.forEach((control,index) => { control.disabled = disabled[index]; });
            this._saveInProgress = false;
        }
    }

    // ————————————————————————————————————————————
    // Sync & Utilities
    // ————————————————————————————————————————————

    _getLabelTextForInput(input) {
        if (!input) return '';

        // 1) Associated <label for="...">
        if (input.id) {
            const lbl = document.querySelector(`label[for="${input.id}"]`);
            if (lbl && lbl.innerText) {
                return lbl.innerText.trim();
            }
        }

        // 2) Placeholder as fallback
        if (input.placeholder) {
            return input.placeholder.trim();
        }

        // 3) Last resort: derive from value via Core.changeCase
        if (input.value && Core.changeCase) {
            return Core.changeCase(input.value.toLowerCase(), 'word');
        }

        return '';
    }

    _updateCategoryNotepad(ctx, labelText) {
        // Only these three have category rows in the Notepad
        if (!['contact', 'customer', 'reference'].includes(ctx)) return;

        const fieldName = `${ctx}.category`;
        const row = document.querySelector(`#npd [data-field="${fieldName}"]`);
        if (!row) return;

        row.textContent = labelText ?? '';
    }

    syncNotepadField(target) {
        const npd = document.getElementById('npd');
        if (!npd || !target) return;

        const key = target.dataset?.npdField || target.name || target.id;
        if (!key) return;

        const row = npd.querySelector(`[data-field="${key}"]`);
        if (!row) return;

        let displayValue = '';

        // For <select>, use the visible label text instead of the value/code
        if (target.tagName === 'SELECT') {
            const select = target;
            const opt = select.options[select.selectedIndex];
            if (opt) {
                displayValue = opt.textContent ?? opt.value ?? '';
            }
        } else {
            // Default behavior for inputs, textareas, etc.
            displayValue = target.value ?? '';
        }

        row.textContent = displayValue;

        if (target.id === 'res-action-code') {
            this._syncActionTandem(target);
        }

        this.resolveDynamicLabels();
    }

    _syncActionTandem(input) {
        // Keep the lookup's description and code paired in the notepad.
        this._setNotepadValue('resolution.actionCode', input.value);
        this._setNotepadValue('resolution.actionAbbr', input.dataset.code || '');
    }

    resolveDynamicLabels() {
        const npd = document.getElementById('npd');
        if (!npd) return;

        const driven = npd.querySelectorAll('[data-label-from]');

        driven.forEach(row => {
            const sourceKey = row.getAttribute('data-label-from');
            if (!sourceKey) return;

            const sourceInput = document.querySelector(`[name="${sourceKey}"]`)
                || document.getElementById(sourceKey);

            if (!sourceInput) {
                this._resolveNotepadLabel(row);
                return;
            }

            const type = sourceInput?.value?.trim();
            if (!type) {
                row.removeAttribute('data-label'); // hides label until value exists
                return;
            }
            const suffix = row.getAttribute('data-label-suffix') || ' ID';
            row.setAttribute('data-label', `${this._prettyLabelValue(type)}${suffix}`);

        });
    }

    collect() {
        return this.persistence.collect(document, {
            incidentId: this.incidentId,
            agentId: this.agentId,
            userId: this.csmUserId,
            timerStart: this.timerStart,
            chosen: this._chosen,
        });
    }

    async validate(payload) {
        const errors = this.persistence.errors(payload);
        if (!this._isValidSubcode('reference')) errors.push('Select a valid Type, Subtype, and Subtype Code combination.');
        if (!errors.length) return true;
        await Core.displayAsyncModalSettled(Core.buildSnip('msg'), errors.join('\n'));
        return false;
    }
    clearSection(sectionNames) {
        const sections = Array.isArray(sectionNames) ? sectionNames : [sectionNames];
        const npd = document.getElementById('npd');

        const sectionsWithSearch = new Set(['contact', 'customer', 'reference']);

        for (const section of sections) {
            // main UI
            const root = document.querySelector(`[data-section="${section}"]`);
            if (root) {
                const fields = root.querySelectorAll('input, textarea, select');
                fields.forEach((el) => {
                    try {
                        if (el.type === 'radio') return;
                        Core.clearElement(el);
                        if (el.dataset?.code !== undefined) el.dataset.code = '';
                    } catch (err) {
                        Core.error('[incident] clearSection', { section, err });
                    }
                });
            }

            // notepad
            if (npd) {
                const rows = npd.querySelectorAll(`[data-field^="${section}"]`);
                rows.forEach((row) => {
                    row.textContent = '';
                });
            }

            // artifacts
            this._clearSectionArtifacts(section);

            if (sectionsWithSearch.has(section)) {
                const searchContainer = document.getElementById(`${section}-search-container`);
                if (searchContainer) {
                    searchContainer.classList.add('dnd');
                }

                const blocks = document.querySelectorAll(`[data-group="${section}-search"]`);
                blocks.forEach((div) => div.classList.add('dnd'));
            }
        }
    };

    _clearSectionArtifacts(section) {
        if (section === 'reference') {
            this._clearChosenReference();
            this._clearReferenceSystem();
            return;
        }

        if (section === 'resolution') {
            const actionSelect = document.getElementById('res-action-code');
            if (actionSelect) actionSelect.selectedIndex = 0;
        }
    }

    _clearCategories(sectionNames) {
        const sections = Array.isArray(sectionNames) ? sectionNames : [sectionNames];

        for (const section of sections) {
            const name = `${section}.category`;
            const radios = document.querySelectorAll(`input[name="${name}"]`);
            radios.forEach(r => { r.checked = false; });
        }
    }

    onSearchClick(ctx) {
        const idInput = document.getElementById(ctx === 'customer' ? 'customer-id' : 'reference-id');
        const searchType = idInput?.dataset?.searchType;

        if (!searchType) {
            const msg = Core.buildSnip('msg');
            Core.displayAsyncModal?.(msg,'Please choose a valid category before searching.');
            return;
        }

        if (ctx === 'reference') {
            this._clearReferenceSystem();
        }
        this.drawSearch(searchType, ctx);
    }

    async drawSearch(searchType, ctx) {
        if (String(searchType).toUpperCase() === 'HEALTHPLAN') {
            if (ctx !== 'customer') return;
            const code = await this._chooseHealthplan();
            if (code) await this._selectSubject(ctx, 'HEALTHPLAN', code);
            return;
        }
        if (!this.search) {
            console.warn('[Incident] Search instance not initialized');
            return;
        }

        const domain = String(searchType || '').toUpperCase();

        if (!['MEMBER', 'PROVIDER', 'VENDOR', 'HEALTHPLAN'].includes(domain)) {
            console.warn('[Incident] drawSearch – unsupported domain:', domain);
            return;
        }

        // Ask Search to handle dialog + pkr + selection
        const result = await this.search.search({ domain });

        // Search handles its own “no rows” + message; we only care if user picked something
        if (!result || result.result !== 1 || !result.selected) {
            return;
        }

        await this._selectSubject(ctx, domain, result.keyId);

    }

    async _chooseHealthplan() {
        const plans = this.lookupStore.arrHealthplan || [];
        if (!plans.length) {
            await Core.displayAsyncModalSettled(Core.buildSnip('msg'), 'No health plans are available.');
            return null;
        }
        const fragment = Core.buildSnip('hsx');
        const select = fragment?.querySelector('#qry-health-plan');
        const confirm = fragment?.querySelector('#search-btn');
        const cancel = fragment?.querySelector('#cancel-btn');
        if (!select || !confirm || !cancel) throw new Error('The Health Plan selection layout is incomplete.');
        const heading = fragment.querySelector('h2');
        if (heading) heading.textContent = 'Choose Health Plan';
        this._populateSelect(select, plans, { includeBlank: true });
        select.required = true;
        return new Promise(resolve => {
            let selection = null;
            const handle = Core.drawDialog({ body: fragment, className: 'modl-medium',
                onClose: () => resolve(selection),
            });
            const choose = () => {
                if (!select.reportValidity()) return;
                selection = select.value;
                handle.close('select');
            };
            confirm.addEventListener('click', choose);
            cancel.addEventListener('click', () => handle.close('cancel'));
            select.addEventListener('keydown', event => {
                if (event.key === 'Enter') { event.preventDefault(); choose(); }
            });
            select.focus();
        });
    }

    _normalizeSubjectDetail(domain, row) {
        switch (domain) {
            case 'MEMBER':
                return {
                    ...row,
                    member_last_name: row.last_name,
                    member_first_name: row.first_name,
                    member_birthdate: row.birthdate,
                    member_sex: row.sex,
                    member_language: row.language,
                    member_address: row.address,
                    member_phone: row.phone,
                };
            case 'PROVIDER':
                return {
                    ...row,
                    provider_last_name: row.last_name,
                    provider_first_name: row.first_name,
                    provider_provider_tax_id: row.provider_tax_id,
                    provider_npi: row.npi,
                    provider_full_name: row.full_name,
                    provider_address: row.address,
                };
            case 'VENDOR':
                return {
                    ...row,
                    vendorid: row.vendor_id, // Compatibility with older database snippets.
                    vendor_npi: row.npi,
                    vendor_full_name: row.full_name,
                    vendor_address: row.address,
                };
            case 'HEALTHPLAN':
                return {
                    healthplan_code: row.HPCODE,
                    healthplan_name: row.HPNAME,
                };
            default:
                return row;
        }
    }

    _applySearchSelection(ctx, domain, selected) {
        if (!selected || typeof selected !== 'object') return;

        const areaRoot = document.querySelector(`#npd [data-area="${ctx}"]`);
        if (!areaRoot) return;

        // 1) Update triad ID input (drives peek/search behavior)
        const idInputId = ctx === 'customer' ? 'customer-id' : 'reference-id';
        const idInput = document.getElementById(idInputId);

        if (idInput) {
            const keyByDomain = {
                MEMBER: 'member_id',
                PROVIDER: 'provider_tax_id', // user-search key
                VENDOR: 'vendor_id',          // user-search key
                HEALTHPLAN: 'healthplan_code',
                OTHER: null,
            };

            const key = keyByDomain[domain];
            idInput.value = domain === 'HEALTHPLAN'
                ? String(selected.healthplan_name ?? '').trim()
                : key ? String(selected[key] ?? '').trim() : '';
            this.syncNotepadField(idInput);
        }

        // 2) Bind search-derived values into the notepad receipt area
        this._bindSearchFields(areaRoot, selected);
    }

    /**
     * Bind search-derived fields (data-bind) inside a scoped root.
     * This NEVER touches data-field (UI-driven model sync).
     */
    _bindSearchFields(root, row) {
        const nodes = root.querySelectorAll('[data-bind]');
        nodes.forEach((el) => {
            const key = el.getAttribute('data-bind');
            if (!key) return;

            const raw = row[key];
            const fmt = el.getAttribute('data-format') || '';

            // Empty should clear the div so [data-label]:not(:empty) logic works
            const out = this._formatBindValue(raw, fmt);

            // If some binds should set input.value, extend here.
            el.textContent = out;
        });
    }

    /**
     * Keep formatting minimal; grow later.
     */
    _formatBindValue(value, fmt) {
        if (value == null) return '';

        // Preserve numbers (e.g. ids) without introducing "undefined"
        let s = String(value).trim();
        if (!s) return '';

        switch (fmt) {
            case 'date':
                // placeholder: keep raw for now
                return s;

            default:
                return s;
        }
    }

    _clearForm() {
        this._contactGeneration++;
        this._contactPromise = null;
        this.csmUserId = null;
        this.clearSection(['contact', 'customer', 'reference', 'resolution']);
        this._clearCategories(['contact', 'customer', 'reference']);
        this._resetSearchUI();
        this._resetIncidentNotepad()

        this.isDirty = false;
        this.incidentId = null;
        this._persistedIncidentId = null;
        this._stopTimer?.();

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });

    }

    _resetSearchUI() {
        ['customer', 'reference'].forEach(ctx => {
            const searchContainer = document.getElementById(`${ctx}-search-container`);
            const searchLabel = document.getElementById(`${ctx}-id-label`);
            const searchButton = document.getElementById(`${ctx}-search`);
            const idInputId = ctx === 'customer' ? 'customer-id' : 'reference-id';
            const idInput = document.getElementById(idInputId);

            // Hide container
            if (searchContainer) searchContainer.classList.add('dnd');

            // Clear label
            if (searchLabel) searchLabel.textContent = '';

            // Reset input
            if (idInput) {
                idInput.value = '';
                idInput.placeholder = '';
                if (idInput.dataset) {
                    idInput.dataset.npdField = '';
                    idInput.dataset.searchType = '';
                }
            }

            // Hide + disable button
            if (searchButton) {
                searchButton.classList.add('dnd');
                searchButton.disabled = true;
            }
        });
    }

    _syncHeader() {
        if (this.agentId) Core.updateNotepad(this.agentId, 'Agent');
    }

    async _fetchCsiNo(generation = this._contactGeneration) {
        try {

            const username = this.agentId || '';

            if (!username) {
                Core.error?.('[incident] Missing Agent for CSINO fetch');
                return null;
            }

            const payload = {
                spName: 'scp.get_next_csino',
                parameters: [
                    { Key: '@p_user_name', Value: username, Type: 'varchar' },
                ],
            };

            const result = await Core.post('ParameterSQL', payload);
            if (generation !== this._contactGeneration) return null;
            const row = Array.isArray(result) ? result[0] : result;
            const csino = row?.CSINO ?? row?.csino ?? null;

            if (!csino) {
                Core.error?.('[incident] No CSINO returned from scp.get_next_csino', { result });
                return null;
            }

            this.incidentId = String(csino); 
            const csmUserId = Number(row.csm_user_id);
            this.csmUserId = Number.isInteger(csmUserId) && csmUserId > 0 ? csmUserId : null;

            const incidentNumber = document.getElementById('incident_number');
            if (incidentNumber) incidentNumber.textContent = this.incidentId;

            Core.info?.('[incident] New CSINO generated', { csino: this.incidentId });
            return this.incidentId;
        } catch (err) {
            Core.error?.('[incident] Error generating new CSINO', err);
            return null;
        }
    }

    async _initiateContact() {
        if (this.incidentId) return;
        const generation = this._contactGeneration;

        const now = new Date();

        // CSINO
        const csino = await this._fetchCsiNo(generation);
        if (!csino || generation !== this._contactGeneration) return;

        if (csino) {
            const npdInc = document.getElementById('incident_number');
            if (npdInc) npdInc.textContent = csino;
        }

        // Assigned To
        const userName = this.agentId || '';

        if (userName) {
            const npdAssign = document.getElementById('res_assign');
            if (npdAssign) npdAssign.textContent = userName;
            Core.setElement('res-assign', userName);
        }

        // Open date
        const openDateStr = now.toLocaleDateString();

        const npdOpen = document.getElementById('incident_open_date');
        if (npdOpen) npdOpen.textContent = openDateStr;

        // state management
        this._stopTimer(); 
        this.timerStart = Date.now();
        this._timerStarted = true;

        // clock time of contact start
        const startEl = document.getElementById('ctc_start');
        if (startEl) {
            const d = new Date(this.timerStart);
            startEl.textContent = d.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit'
            });
        }

        // contact duration
        const elapsedEl = document.getElementById('ctc_elapsed');
        if (elapsedEl) {
            elapsedEl.textContent = '00:00:00';
            elapsedEl.classList.remove('warn');
        }

        this.timerHandle = setInterval(() => this._tick(), 1000);

    }

    async _ensureContact(evt) {
        // If we already have an incident, nothing to do
        if (this.incidentId) return;

        // We only initiate contacts from inside the incident UI
        const container = document.getElementById('scp');
        if (!container) return; // incident UI not even rendered yet

        // If we have an event, make sure the target is inside the incident UI
        if (evt && evt.target && !container.contains(evt.target)) {
            return; // e.g., login screen, global header, etc.
        }

        // Prevent double-init if multiple events land at once
        if (this._contactPromise) return this._contactPromise;
        const pending = this._initiateContact();
        this._contactPromise = pending;
        try {
            await pending;
        } finally {
            if (this._contactPromise === pending) this._contactPromise = null;
        }
    }

    _tick() {
        const elapsed = Date.now() - (this.timerStart || Date.now());
        const el = document.getElementById('ctc_elapsed');
        if (!el) return;

        el.textContent = this._formatHMS(elapsed);
        el.classList.toggle('warn', elapsed > this.warnThresholdMs);
    }

    _formatHMS(ms) {
        const totalSec = Math.floor(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;

        return `${h.toString().padStart(2, '0')}:` +
            `${m.toString().padStart(2, '0')}:` +
            `${s.toString().padStart(2, '0')}`;
    }

    _stopTimer() {
        if (this.timerHandle) {
            clearInterval(this.timerHandle);
            this.timerHandle = null;
        }

        this._timerStarted = false;
        this.timerStart = null;

        const startEl = document.getElementById('ctc_start');
        if (startEl) {
            startEl.textContent = '';
        }

        const elapsedEl = document.getElementById('ctc_elapsed');
        if (elapsedEl) {
            elapsedEl.textContent = '';
            elapsedEl.classList.remove('warn');
        }
    }

    _resetIncidentNotepad() {
        const ids = [
            'incident_number',
            'incident_open_date',
            'incident_close_date',
        ];

        ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = '';
        });
    }

    // ————————————————————————————————————————————
    // Reference triad helpers
    // ————————————————————————————————————————————

    onTypeChange(_e) {
        this.isDirty = true;

        const typeSel = document.getElementById('ref-type');
        const subSel = document.getElementById('ref-sub-type');
        const codeInp = document.getElementById('ref-type-abbr');

        const typeCode = typeSel?.value || '';
        const refCat = this.categories.reference;

        let subtypeOptions = [];

        if (typeCode && refCat.byType[typeCode]) {
            const bySubtype = refCat.byType[typeCode].bySubtype;
            subtypeOptions = Object.values(bySubtype).map(sub => ({
                value: sub.code,   // sub_type_code
                label: sub.label,  // sub_type_description
            }));
        }

        // Rebuild the subtype select based on selected type
        this._populateSelect(subSel, subtypeOptions, { includeBlank: true });

        // Clear code input whenever type changes
        if (codeInp) {
            codeInp.value = '';
        }

        this.syncNotepadField(typeSel);
        this.syncNotepadField(subSel);
        this.syncNotepadField(codeInp);
    }

    onSubtypeChange(_e) {
        this.isDirty = true;

        const typeSel = document.getElementById('ref-type');
        const subSel = document.getElementById('ref-sub-type');
        const codeInp = document.getElementById('ref-type-abbr');

        const subCode = subSel?.value || '';

        if (codeInp) {
            codeInp.value = subCode;
        }

        this.syncNotepadField(typeSel);
        this.syncNotepadField(subSel);
        this.syncNotepadField(codeInp);
    }

    async onSubcodeChange(e) {
        this.isDirty = true;

        const input = e.target;
        const rawCode = (input.value || '').trim().toUpperCase();

        const typeSel = document.getElementById('ref-type');
        const subSel = document.getElementById('ref-sub-type');
        const refCat = this.categories.reference;

        // If user cleared the field, clear companions and sync blanks
        if (!rawCode) {
            if (typeSel) typeSel.value = '';
            if (subSel) this._populateSelect(subSel, [], { includeBlank: true });

            this.syncNotepadField(typeSel);
            this.syncNotepadField(subSel);
            this.syncNotepadField(input);
            return;
        }

        const matches = refCat.byCode?.[rawCode] || [];

        if (matches.length === 0) {
            // No such code anywhere in arrTypeSubType
            if (typeSel) typeSel.value = '';
            if (subSel) this._populateSelect(subSel, [], { includeBlank: true });
            input.value = '';

            const msg = Core.buildSnip('msg');
            Core.displayAsyncModal(msg, `'${rawCode}' is not a valid Sub Type Code.`);

            this.syncNotepadField(typeSel);
            this.syncNotepadField(subSel);
            this.syncNotepadField(input);
            return;
        }

        let chosen;

        if (matches.length === 1) {
            chosen = matches[0];
        } else {
            // more than 1 match => let user pick the correct type/subtype
            chosen = await this._chooseSubcode(matches);
            if (!chosen) {
                if (typeSel) typeSel.value = '';
                if (subSel) this._populateSelect(subSel, [], { includeBlank: true });
                input.value = '';
                this.syncNotepadField(typeSel);
                this.syncNotepadField(subSel);
                this.syncNotepadField(input);
                return;
            }
        }

        const { typeCode, typeDesc, subCode, subDesc } = chosen;

        // 1) Fix Type select
        if (typeSel) {
            typeSel.value = typeCode;

            // rebuild subtype list for the chosen type
            const bySubtype = refCat.byType[typeCode]?.bySubtype || {};
            const subtypeOptions = Object.values(bySubtype).map(sub => ({
                value: sub.code,
                label: sub.label,
            }));
            this._populateSelect(subSel, subtypeOptions, { includeBlank: true });
        }

        // 2) Fix Subtype select
        if (subSel) {
            subSel.value = subCode;
        }

        // 3) Reflect final code back to the input (in case casing changed)
        input.value = subCode;

        // 4) Sync notepad (code + type text + subtype text)
        this.syncNotepadField(typeSel);
        this.syncNotepadField(subSel);
        this.syncNotepadField(input);
    }

    async _chooseSubcode(matches) {
        if (!matches.length) return null;
        const rows = matches.map(m => [m.typeCode, m.typeDesc, m.subCode, m.subDesc]);
        const table = Core.buildTable(rows, ['Type Code', 'Type', 'Sub Code', 'Subtype'], 'ref-dup-table');
        const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'lbn'; cancel.textContent = 'Cancel';
        return new Promise(resolve => {
            let selected = null;
            const handle = Core.drawDialog({ title: 'Select Type', body: table, footer: cancel, className: 'modl-wide', scrollable: true,
                onClose: () => resolve(selected),
            });
            cancel.onclick = () => handle.close('cancel');
            Array.from(table.tBodies[0].rows).forEach((row, index) => {
                row.tabIndex = 0;
                const choose = () => { selected = matches[index]; handle.close('select'); };
                row.addEventListener('click', choose);
                row.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); }
                });
            });
        });
    }

    _isValidSubcode(ctx, valueOverride) {
        if (ctx !== 'reference') return false;
        const type = document.getElementById('ref-type')?.value;
        const subtype = document.getElementById('ref-sub-type')?.value;
        const code = String(valueOverride ?? document.getElementById('ref-type-abbr')?.value ?? '').trim().toUpperCase();
        return !!type && !!subtype && !!code && (this.categories.reference.byCode[code] || [])
            .some(match => match.typeCode === type && match.subCode === subtype && match.subCode === code);
    }

    _populateSelect(selectEl, options, { includeBlank = false } = {}) {
        if (!selectEl) return;

        selectEl.innerHTML = '';

        if (includeBlank) {
            const blank = document.createElement('option');
            blank.value = '';
            blank.textContent = '';
            selectEl.appendChild(blank);
        }

        for (const o of options || []) {
            const opt = document.createElement('option');

            if (Array.isArray(o)) {
                // [value, label]
                opt.value = o[0] ?? '';
                opt.textContent = o[1] ?? o[0] ?? '';
            } else if (typeof o === 'object') {
                // { value, label, code, ... }
                const value = o.value ?? o.code ?? '';
                const label = o.label ?? value;
                opt.value = value;
                opt.textContent = label;
            } else {
                // primitive (string/number)
                opt.value = String(o);
                opt.textContent = String(o);
            }

            selectEl.appendChild(opt);
        }
    }

    // Collection and detail orchestration.
    _initReferenceCollectionSystem() {
        this._rmgr = null;
        this._clct = null;
        this._detl = null;
        this._detailGeneration = 0;

        this._referenceDomain = null;
        this._referenceKeyId = null;

        this._chosen = {
            artifactType: '',
            artifactId: '',
        };
    }

    // Called when Reference ID resolves to a subject (after peek/search)
    async showReferenceCollections({ domain, subjectId }) {
        const D = String(domain || '').toUpperCase();

        const factory = { MEMBER: createMemberContract, PROVIDER: createProviderContract, VENDOR: createVendorContract }[D];
        if (!factory) {
            this._clearReferenceSystem();
            return;
        }

        // New reference subject invalidates the previous reference system.
        this._detailGeneration++;
        this._detl?.destroy?.();
        this._detl = null;

        this._clct?.destroy?.();
        this._clct = null;

        this._rmgr?.destroy?.();
        this._rmgr = null;

        this._referenceDomain = D;
        this._referenceKeyId = subjectId;

        const contract = factory();

        const manager = new Core.Rmgr(contract);
        this._rmgr = manager;
        manager.initialize();

        try {
            await manager.load(subjectId);
        }
        catch (error) {
            if (this._rmgr !== manager) return;
            console.error('[Incident] Rmgr load failed', error);
            if (error instanceof AggregateError) {
                error.errors.forEach((cause, index) => {
                    console.error(
                        `[Incident] Rmgr failure ${index + 1}`,
                        cause
                    );
                });
            }
            throw error;
        }

        if (this._rmgr !== manager) return;

        const blueprint = {
            autoHydrate: false,
            activeTabKey: Object.keys(contract.sets)[0],
            tabs: Object.values(contract.sets).map(set => ({
                key: set.key,
                label: set.label,
                panel: {
                    kind: 'table',
                    tableId: set.metadata.tableId,
                    selectable: !!set.metadata.detail,
                    sortable: true,
                    rowCountInTab: true,
                },
                detail: set.metadata.detail,
            })),
        };

        const host = document.querySelector('.clct');

        if (!host) {
            console.warn('[Incident] collection host not found');
            return;
        }

        const collection = new Core.Clct({
            host,
            blueprint,

            ctx: {
                subjectId,
            },

            callbacks: {
                onFocusChange: ({ tabKey, rowId, row }) => {

                },
                onShowDetail: req => {
                    this._showDetail(req);
                },
                onFilter: async ({ tabKey }) => {
                    try { await this._rmgr?.requestFilter(tabKey); }
                    catch (error) { await Core.displayAsyncModal(Core.buildSnip('msg'), `Unable to filter: ${error.message}`); }
                },
                onClearFilter: ({ tabKey }) => this._rmgr?.clearFilter(tabKey),
                onViewFilter: async ({ tabKey }) => {
                    try { await this._rmgr?.viewFilter(tabKey); }
                    catch (error) { await Core.displayAsyncModal(Core.buildSnip('msg'), `Unable to view filter: ${error.message}`); }
                },
            },
        });

        this._clct = collection;
        await collection.build();
        if (this._rmgr !== manager || this._clct !== collection) return;
        host.classList.remove('dnd');

        manager.subscribe(({ change }) => {
            if (this._rmgr === manager && change.reason === 'view-updated') {
                this._refreshCollectionViews(contract);
            }
        });
        this._refreshCollectionViews(contract);
    }

    _refreshCollectionViews(contract) {
        const active = this._rmgr.hasActiveFilter();
        const filterable = this._rmgr.getFilterableSetKeys().length > 0;
        for (const view of this._rmgr.getViews()) {
            const set = contract.sets[view.key];
            const table = Core.buildRecordTable(view.records, {
                id: set.metadata.tableId,
                rowId: set.recordId,
                columns: set.metadata.columns,
            });
            Core.makeTableSortable(table);
            this._clct.updatePanel(view.key, {
                content: view.visibleCount ? table : null,
                count: { visible: view.visibleCount, total: view.totalCount },
                status: view.visibleCount ? 'ready' : 'empty',
                filterable,
                filtered: active,
                filterText: active ? 'Filter applied to collections.' : '',
            });
            if (!view.visibleCount) this._clct.setPanelStatus(view.key, 'empty');
        }
    }

    // -----------------------------------------
    // 4) Detail show/build/destroy
    // -----------------------------------------
    async _showDetail(req) {
        if (!req?.detail || !req?.rowId) return false;
        const host = document.querySelector('.detl');
        if (!host) return false;
        const generation = ++this._detailGeneration;
        this._detl?.destroy?.();
        this._detl = null;
        host.classList.add('dnd');
        // Core can finish an asynchronous build after replacement. Give each
        // request its own detached shell so it cannot overwrite the live view.
        const shell = host.cloneNode(false);
        shell.innerHTML = '<div class="detl__hdr"><span class="detl__icon"></span></div><div class="detl__data"></div>';
        let view;
        const current = () => generation === this._detailGeneration && this._detl === view;
        const hide = clear => {
            if (!current()) return;
            this._detailGeneration++;
            if (clear) this._clearChosenReference();
            shell.classList.add('dnd');
            view.destroy(); this._detl = null;
        };
        view = new Core.Detl({
            host: shell,
            blueprint: {
                sp: req.detail.sp,
                params: ctx => [{ key: req.detail.idParameter, value: ctx.rowId, type: 'varchar' }],
                contentSnipId: req.detail.snip,
                canChoose: req.detail.canChoose === true,
                canClose: true,
                canClearAfterChoose: true,
            },
            ctx: { rowId: req.rowId, tabKey: req.tabKey, tabLabel: req.tabLabel },
            io: {
                buildSnip: id => {
                    const snippet = Core.buildSnip(id);
                    if (!snippet?.querySelector('[data-bind]')) throw new Error('The detail layout is unavailable.');
                    return snippet;
                },
                postParam: async (sp, params) => {
                    const result = await Core.post('ParameterSQL', { spName: sp,
                        parameters: params.map(param => ({ Key: param.key, Value: param.value, Type: param.type || 'varchar' })),
                    });
                    const row = Array.isArray(result) ? result[0] : result?.rows?.[0] || result?.recordset?.[0] || result;
                    const key = { claims: 'CLAIMNO', authorizations: 'AUTHNO', incidents: 'CSINO' }[req.tabKey];
                    if (!row || !key || String(row[key]) !== String(req.rowId)) throw new Error('The detail response does not match the selected record.');
                    return [row];
                },
            },
            callbacks: {
                onChoose: () => { if (current()) this._setChosenReference(req.tabKey, req.rowId); },
                onClear: () => hide(true),
                onClose: () => hide(false),
            },
        });
        this._detl = view;
        try {
            await view.build();
            if (!current()) { view.destroy(); return false; }
            this._resolveDetailLabels(shell);
            await this._renderRelatedDetail(req, shell, current);
            if (!current()) { view.destroy(); return false; }
            shell.classList.remove('dnd');
            host.replaceWith(shell);
            return true;
        } catch (error) {
            view.destroy();
            if (generation !== this._detailGeneration) return false;
            this._detl = null;
            host.replaceChildren(); host.classList.remove('dnd');
            const message = document.createElement('p'); message.setAttribute('role', 'alert');
            message.textContent = 'Unable to load detail. ' + error.message;
            const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'lbn'; retry.textContent = 'Retry';
            retry.onclick = () => { if (generation === this._detailGeneration) void this._showDetail(req); };
            host.append(message, retry);
            return false;
        }
    }

    _resolveDetailLabels(host) {
        host.querySelectorAll('[data-bind][data-label-from]').forEach(field => {
            const source = Array.from(host.querySelectorAll('[data-bind]'))
                .find(candidate => candidate.dataset.bind === field.dataset.labelFrom);
            const category = source?.textContent?.trim();
            if (!category) return; // Preserve the snippet's initial label.

            const suffix = category.toUpperCase() === 'MEMBER' ? ' Number'
                : category.toUpperCase() === 'OTHER' ? ' Name' : ' ID';
            field.dataset.label = `${this._prettyLabelValue(category)}${suffix}`;
        });
    }

    _getRelatedDetail(req) {
        const relatedMap = {
            claims: [
                {
                    target: 'dia-div',
                    sp: 'scp.get_artifact_diagnosis',
                    params: (rowId) => [{ name: '@p_artifact_id', value: rowId }],
                    tableId: 'artifactDiagnosis-table',
                    columnMap: { '#': { sortType: 'number' } },
                    empty: 'No diagnosis records available.',
                },
                {
                    target: 'prc-div',
                    sp: 'scp.get_claim_procedure',
                    params: (rowId) => [{ name: '@p_CLAIMNO', value: rowId }],
                    tableId: 'claimProcedure-table',
                    columnMap: { '#': { sortType: 'number' }, Date: { sortType: 'date', displayFormat: 'date' }, Quantity: { sortType: 'number' }, Billed: { sortType: 'number', displayFormat: 'currency' }, Allowed: { sortType: 'number', displayFormat: 'currency' }, Paid: { sortType: 'number', displayFormat: 'currency' }, Adj: { format: 'html' }, Note: { format: 'html' } },
                    empty: 'No procedure records available.',
                },
                {
                    target: 'cps-div',
                    sp: 'scp.get_claim_processing_status',
                    params: (rowId) => [{ name: '@p_CLAIMNO', value: rowId }],
                    tableId: 'claimProcessStatus-table',
                    columnMap: { '#': { sortType: 'number' } },
                    empty: 'No process status records available.',
                },
                {
                    target: 'nte-div',
                    sp: 'scp.get_artifact_note',
                    params: (rowId) => [{ name: '@p_artifact_id', value: rowId }],
                    tableId: 'artifactNote-table',
                    columnMap: { '#': { sortType: 'number' }, Date: { sortType: 'date', displayFormat: 'date' } },
                    empty: 'No notes available.',
                },
                {
                    target: 'oth-div',
                    sp: 'scp.get_referenced_artifact',
                    params: (rowId) => [{ name: '@p_artifact_id', value: rowId }],
                    tableId: 'referencedArtifact-table',
                    columnMap: { '#': { sortType: 'number' } },
                    empty: 'No referenced records available.',
                },
                {
                    target: 'inc-div',
                    sp: 'scp.get_related_incident',
                    params: (rowId) => [{ name: '@p_artifact_id', value: rowId }],
                    tableId: 'relatedIncident-table',
                    columnMap: { '#': { sortType: 'number' }, 'Opened Date': { sortType: 'date', displayFormat: 'date' }, 'Closed Date': { sortType: 'date', displayFormat: 'date' } },
                    empty: 'No related records found.',
                },
                {
                    target: 'dup-div',
                    sp: 'scp.get_claim_duplicate',
                    params: (rowId) => [{ name: '@p_CLAIMNO', value: rowId }],
                    tableId: 'claimDuplicate-table',
                    columnMap: { '#': { sortType: 'number' }, Status: { format: 'html' }, Received: { sortType: 'date', displayFormat: 'date' }, 'Date Range': { sortType: 'text', displayFormat: 'dateRange' }, 'Date Paid': { sortType: 'date', displayFormat: 'date' }, Billed: { sortType: 'number', displayFormat: 'currency' }, 'Net Pay': { sortType: 'number', displayFormat: 'currency' }, 'Primary Dx': { format: 'html' } },
                    empty: 'No duplicates found.',
                },
            ],
            authorizations: [
                {
                    target: 'inp-div',
                    sp: 'scp.get_authorization_inpatient_detail',
                    params: (rowId) => [{ name: '@p_AUTHNO', value: rowId }],
                    tableId: 'inpatientDetail-table',
                    columnMap: { 'Admit Date': { sortType: 'date', displayFormat: 'date' }, 'Discharge Date': { sortType: 'date', displayFormat: 'date' }, 'Admit Diagnosis': { format: 'html' }, 'Admission Source': { format: 'html' } },
                    empty: 'No inpatient records found for this authorization.',
                },
                {
                    target: 'dia-div',
                    sp: 'scp.get_artifact_diagnosis',
                    params: (rowId) => [{ name: '@p_artifact_id', value: rowId }],
                    tableId: 'artifactDiagnosis-table',
                    columnMap: { '#': { sortType: 'number' } },
                    empty: 'No diagnosis records available.',
                },
                {
                    target: 'prc-div',
                    sp: 'scp.get_authorization_procedure',
                    params: (rowId) => [{ name: '@p_AUTHNO', value: rowId }],
                    tableId: 'authorizationProcedure-table',
                    columnMap: { '#': { sortType: 'number' }, Date: { sortType: 'date', displayFormat: 'date' }, Quantity: { sortType: 'number' } },
                    empty: 'No procedure records available.',
                },
                {
                    target: 'nte-div',
                    sp: 'scp.get_artifact_note',
                    params: (rowId) => [{ name: '@p_artifact_id', value: rowId }],
                    tableId: 'artifactNote-table',
                    columnMap: { '#': { sortType: 'number' }, Date: { sortType: 'date', displayFormat: 'date' } },
                    empty: 'No notes available.',
                },
                {
                    target: 'xrf-div',
                    sp: 'scp.get_claim_xref',
                    params: (rowId) => [{ name: '@p_AUTHNO', value: rowId }],
                    tableId: 'claimXref-table',
                    columnMap: { '#': { sortType: 'number' }, 'Date Received': { sortType: 'date', displayFormat: 'date' } },
                    empty: 'Authorization is not referenced in any claims.',
                },
                {
                    target: 'oth-div',
                    sp: 'scp.get_referenced_artifact',
                    params: (rowId) => [{ name: '@p_artifact_id', value: rowId }],
                    tableId: 'referencedArtifact-table',
                    columnMap: { '#': { sortType: 'number' } },
                    empty: 'No referenced records available.',
                },
                {
                    target: 'inc-div',
                    sp: 'scp.get_related_incident',
                    params: (rowId) => [{ name: '@p_artifact_id', value: rowId }],
                    tableId: 'relatedIncident-table',
                    columnMap: { '#': { sortType: 'number' }, 'Opened Date': { sortType: 'date', displayFormat: 'date' }, 'Closed Date': { sortType: 'date', displayFormat: 'date' } },
                    empty: 'No related records found.',
                },
            ],
            incidents: [
                {
                    target: 'nte-div',
                    sp: 'scp.get_incident_note',
                    params: (rowId) => [
                        {
                            name: '@p_CSINO',
                            value: rowId,
                        },
                    ],
                    tableId: 'incidentNote-table',
                    columnMap: { Date: { sortType: 'date', displayFormat: 'date' }, Action: { format: 'html' }, Result: { format: 'html' } },
                    empty: 'No notes available.',
                },
            ],
        };

        return relatedMap[req.tabKey] || [];
    }

    async _fetchRelatedDetail(cfg, rowId) {
        const payload = {
            spName: cfg.sp,
            parameters: cfg.params(rowId).map(p => ({
                Key: p.name,
                Value: p.value,
                Type: p.type || 'varchar',
            })),
        };

        const result =
            await Core.post('ParameterSQL', payload);

        if (Array.isArray(result)) {
            return result;
        }

        if (Array.isArray(result?.rows)) {
            return result.rows;
        }

        return [];
    }

    async _renderRelatedDetail(req, root = document, current = () => true) {
        const related = this._getRelatedDetail(req);

        for (const cfg of related) {
            if (!current()) return;
            const target =
                root.querySelector('[id="' + cfg.target + '"]');

            if (!target) {
                console.warn(
                    '[Incident] Related detail target not found:',
                    cfg.target
                );
                continue;
            }

            const rows =
                await this._fetchRelatedDetail(
                    cfg,
                    req.rowId
                );

            if (!current()) return;
            target.innerHTML = '';

            if (!rows.length) {
                target.textContent = cfg.empty;
                continue;
            }

            const table = Core.buildRecordTable(
                rows,
                {
                    id: cfg.tableId,
                    columns: Object.keys(rows[0]).map(key => ({
                        key,
                        label: ({ artifact_id: 'Artifact ID', CLAIMNO: 'Claim ID', AUTHNO: 'Authorization ID', CSINO: 'Incident ID' })[key] ?? key,
                        sortable: true,
                        sortType: 'text',
                        ...cfg.columnMap?.[key],
                    })),
                }
            );

            target.appendChild(table);
            Core.makeTableSortable(table);

        }
    }

    // -----------------------------------------
    // 5) Ancestor "chosen" helpers (notepad update)
    // -----------------------------------------
    _setChosenReference(artifactType, artifactId) {
        const type = String(artifactType || '').toUpperCase();
        if (!['CLAIM', 'CLAIMS', 'AUTHORIZATION', 'AUTHORIZATIONS'].includes(type)) return false;
        this._chosen.artifactType = String(artifactType || '').toUpperCase();
        this._chosen.artifactId = String(artifactId || '');

        // Example: reference_artifact_type, reference_artifact_identifier
        this._setNotepadValue('reference.artifactType', this._chosen.artifactType);
        this._setNotepadValue('reference.artifactId', this._chosen.artifactId);

        this.resolveDynamicLabels();
        return true;
    }

    _clearChosenReference() {
        this._chosen.artifactType = '';
        this._chosen.artifactId = '';

        this._setNotepadValue('reference.artifactType', '');
        this._setNotepadValue('reference.artifactId', '');

        this.resolveDynamicLabels();
    }

    _clearReferenceSystem() {
        this._detailGeneration++;
        this._detl?.destroy?.();
        this._detl = null;

        this._clct?.destroy?.();
        this._clct = null;

        this._rmgr?.destroy?.();
        this._rmgr = null;

        this._referenceDomain = null;
        this._referenceKeyId = null;

        document.querySelector('.clct')?.classList.add('dnd');
        document.querySelector('.detl')?.classList.add('dnd');
    }

    _setNotepadValue(fieldPath, value) {
        // generic setter for data-field divs.
        const el = document.querySelector(`[data-field="${fieldPath}"]`);
        if (!el) return;
        el.textContent = String(value ?? '').trim();

    }

    _resolveNotepadLabel(el) {
        const labelFrom = el.dataset.labelFrom;
        if (!labelFrom) return;

        // Preserve the markup-defined fallback once.
        if (!el.dataset.defaultLabel) {
            el.dataset.defaultLabel =
                el.dataset.label ?? '';
        }

        const source = document.querySelector(
            `[data-field="${labelFrom}"]`
        );

        const sourceValue =
            source?.textContent?.trim();

        if (!sourceValue) {
            el.dataset.label =
                el.dataset.defaultLabel;
            return;
        }

        const suffix =
            el.dataset.labelSuffix ?? '';

        const prettySource = this._prettyLabelValue(sourceValue);

        el.dataset.label =
            `${prettySource}${suffix}`;
    }

    _prettyLabelValue(value) {
        let text = String(value ?? '')
            .trim()
            .toLowerCase();

        if (!text) return '';

        const singular = {
            claims: 'claim',
            authorizations: 'authorization',
            incidents: 'incident',
        };

        text = singular[text] ?? text;

        return text.replace(
            /\b\w/g,
            char => char.toUpperCase()
        );
    }

    async onNpiInputChange(evt) {
        const input = evt.currentTarget;
        if (!(input instanceof HTMLInputElement)) return;

        const scope = document.getElementById('npiq');
        if (!scope) return;

        const npi = input.value.trim();

        Core.clearBindings(scope);
        if (!npi) return;

        const payload = await this.npiqByNumber(npi);

        Core.applyBindings(scope, payload);
        Core.applyTables(scope, payload);
    }

    async onNpiButtonClick() {
        const nrx = Core.buildSnip('nsx');
        Core.drawModal(nrx, "450px");

        const modal = document.querySelector('.modl-window');
        modal.querySelectorAll('input.inp[type="text"]').forEach(input => {
            input.addEventListener('input', () => {
                input.value = Core.changeCase(input.value);
            });
        });
        document.getElementById('search-btn').addEventListener('click', (e) => this.onNpiButtonSearch(e), { once: true });
        document.getElementById('cancel-btn').addEventListener('click', () => Core.dismissModal(), { once: true });

    }

    async onNpiButtonSearch() {
        const lastName = Core.getElement('qry-last-name');
        const firstName = Core.getElement('qry-first-name');
        const state = Core.getElement('qry-state');
        Core.dismissModal();

        const scope = document.getElementById('npiq');
        if (!scope) return;

        Core.clearBindings(scope);

        const payload = await this.npiqByName(lastName, state, firstName, 200, '');

        Core.applyBindings(scope, payload);
        Core.applyTables(scope, payload);
    }

    async npiqByNumber(number) {
        const res = await fetch(`/api/npiq/by-number?number=${encodeURIComponent(number)}`);
        if (!res.ok) throw new Error(`NPI query failed (${res.status})`);
        return await res.json();
    }

    async npiqByName(last, state, first, limit, enumerationType) {
        const qs = new URLSearchParams({
            last: last ?? '',
            state: state ?? '',
        });

        if (first) qs.set('first', first);
        if (limit != null) qs.set('limit', String(limit));
        if (enumerationType) qs.set('enumeration_type', enumerationType); // note the underscore

        const res = await fetch(`/api/npiq/by-name?${qs.toString()}`);
        if (!res.ok) throw new Error(`NPI search failed (${res.status})`);
        return await res.json();
    }

    async _selectSubject(ctx, domain, keyId) {

        const detail = await this._getSubjectDetail(domain, keyId);

        if (!detail) {
            console.warn('[Incident] no detail returned', { domain, keyId });
            return;
        }

        const normalized = this._normalizeSubjectDetail(domain, detail);

        this._applySearchSelection(ctx, domain, normalized);

        if (ctx === 'reference') {
            await this.showReferenceCollections({
                domain,
                subjectId: keyId,
            });
        }

    }

    async _getSubjectDetail(domain, keyId) {
        const detailMap = {
            MEMBER: {
                spName: 'scp.get_member_detail',
                keyName: 'MEMB_KEYID',
            },
            PROVIDER: {
                spName: 'scp.get_provider_detail',
                keyName: 'PROV_KEYID',
            },
            VENDOR: {
                spName: 'scp.get_vendor_detail',
                keyName: 'VEN_KEYID',
            },
            HEALTHPLAN: {
                spName: 'scp.get_healthplan_detail',
                keyName: 'HPCODE',
                parameter: '@p_healthplan_code',
            },
        };

        const cfg = detailMap[domain];
        if (!cfg) {
            console.warn('[Incident] no detail configuration', { domain, keyId });
            return null;
        }

        const parameters = [
            {
                Key: cfg.parameter || `@p_${cfg.keyName}`,
                Value: keyId,
                Type: 'varchar',
            },
        ];

        const payload = {
            spName: cfg.spName,
            parameters,
        };

        const result = await Core.post('ParameterSQL', payload);

        if (!Array.isArray(result) || result.length === 0) {
            console.warn('[Incident] no subject detail returned', {
                domain,
                keyId,
            });
            return null;
        }

        return result[0];
    }

}
