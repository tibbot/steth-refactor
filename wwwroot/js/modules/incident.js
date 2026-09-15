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
console.log('Stethoscope Core ID:', Core.CORE_INSTANCE_ID);
import { Lookup } from './lookup.js';
import { Search } from './search.js';

export class Incident {
    constructor({ snip }) {
        this.Snip = snip;
        this.agentId = Core.getCookie('pEL')?.trim() || null; // ezcap user
        console.log(this.agentId);

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
            { domain: 'MEMBER', label: 'Member', peekType: 'member', searchProc: 'scp.get_member_search', searchSnipId: 'msx' },
            { domain: 'PROVIDER', label: 'Provider', peekType: 'provider', searchProc: 'scp.get_provider_search', searchSnipId: 'psx' },
            { domain: 'VENDOR', label: 'Vendor', peekType: 'vendor', searchProc: 'scp.get_vendor_search', searchSnipId: 'vsx' },
            { domain: 'HEALTHPLAN', label: 'Health Plan', peekType: 'healthplan', searchProc: 'scp.get_healthplan_search', searchSnipId: 'hsx' },
        ];

        this.search = new Search({ snip: this.Snip, searchMap }); 

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

                //{ target: '#ctc-rel', type: 'change', handler: (e) => this.onRelationshipChange(e) },

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
                //{ target: '.sbn', type: 'click', handler: (e) => this.setDropDown(e.target) },
                //{ target: '.ibn', type: 'click', handler: (e) => this.setSearch(e.target) },

                // Artifact toggles & peeks
                //{ target: '.art-icon',     type: 'click',  handler: (e) => this.toggleArtifact(e) },
                { target: '#customer-id',  type: 'change', handler: (e) => this.peekSubject(e.target) },
                { target: '#reference-id', type: 'change', handler: (e) => this.peekSubject(e.target) },

                { target: '#res-action-abbr', type: 'change', handler: () => this._syncActionTandem('code') },
                { target: '#res-action-code', type: 'change', handler: () => this._syncActionTandem('select') },

                // Tabs & actions
                //{ target: '.tab',           type: 'click',  handler: (e) => this.selectTab(e.target.id) },
                { target: '#reset-btn', type: 'click', handler: (e) => this.confirmClearAll(e) },
                { target: '#save-more-btn', type: 'click', handler: (e) => this.saveAndMore(e) },
                { target: '#save-new-btn', type: 'click', handler: (e) => this.saveAndNew(e) },
                //{ target: '#res-status',    type: 'change', handler: (e) => this.closeIncident(e.target.id) },

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
        this._attachValidation();
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
        this._populateResolutionUI();
    }

    _populateLookupSelects() {
        // Action: arrAction -> #res-action
        const actionArr = this.lookupStore.arrAction || [];
        const actionNames = actionArr.map(row => row[1]); // [code, name]

        if (actionNames.length) {
            Core.buildSelect('res-action', actionNames, true);
        }

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

    _populateResolutionUI() {
        // Populate Action select
        const actionArr = this.lookupStore.arrAction || [];
        const actionNames = actionArr.map(row => row[1]); // display text

        if (actionNames.length) {
            // true = include empty option at top
            Core.buildSelect('res-action-code', actionNames, true);
        }

        // Assigned To stays driven by lookup + button; no select to populate here.
    }

    _attachListeners() {

        const configs = this.config.listeners.map(({ target, type, handler }) => {
            // Wrap original handler to preserve `this` and timer semantics
            const wrapped = (evt) => {
                try {
                    handler.call(this, evt);
                } finally {
                    this._ensureContact(evt); // start timer after first real interaction
                }
            };

            return {
                target,
                event: type,   // Core.attachEventListeners expects `event`
                handler: wrapped,
            };
        });

        Core.attachEventListeners(configs);
        // to detach later
        this._boundListeners = configs;
    }


    detachListeners() {
        for (const { type, bound } of this._delegated) document.removeEventListener(type, bound);
        this._delegated = [];
    }

    // ————————————————————————————————————————————
    // Validation (Core vldt)
    // ————————————————————————————————————————————

    _attachValidation() {

        Core.vldt?.initForm('#scp', {
            // Contact
            '#ctc-rel': [{ rule: 'required', msg: 'Relationship required' }],
            // Reference triad
            '#reference-type': [{ rule: 'required', msg: 'Type required' }],
            '#reference-subtype': [{ rule: 'required', msg: 'Subtype required' }],
            '#reference-subcode': [
                { rule: 'required', msg: 'Code required' },
                { rule: 'custom', fn: () => this._isValidSubcode('reference'), msg: 'Invalid code for selected subtype' },
            ],
        });
    }

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

    // Inside export class Incident { ... }

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

        const validCats = ['MEMBER', 'PROVIDER', 'VENDOR', 'HEALTHPLAN'];
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


    setDropDown(target) {
        if (Core.toggleDropdown) Core.toggleDropdown(target);
    }

    //setSearch(target) {
    //    // Determine panel context from the clicked button (customer|reference)
    //    const ctx = target.closest?.('#customer-panel') ? 'customer' : target.closest?.('#reference-panel') ? 'reference' : 'customer';
    //    // Read selected category from the appropriate button bar
    //    const radio = document.querySelector(`input[name="${ctx}-category"]:checked`);
    //    const category = radio?.value || 'member';
    //    Core.openSearchWindow?.({ ctx, category, source: target });
    //}

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

        const domain = this._getActiveDomain(ctx); // must return 'MEMBER'|'PROVIDER'|'VENDOR'
        if (!domain) return;

        const term = String(input.value ?? '').trim();
        if (!term) return;

        const peekResult = await this.search.peek({ term, domain });

        if (!peekResult || peekResult.result !== 1 || !peekResult.keyId) {
            input.value = '';
            this.syncNotepadField(input);
            return;
        }

        await this._selectSubject(ctx, domain, peekResult.keyId);

        // this._applySearchSelection(ctx, domain, peekResult.selected);
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

    async saveAndMore(_e) {
        await this.save();

        this.clearSection(['reference', 'resolution']);
        this.incidentId = null;
        this.isDirty = false;

        this._stopTimer();
        this.incidentId = null;

        await this._initiateContact(); // immediately spin up next incident + timer
    }

    async saveAndNew(_e) {
        await this.save();
        this._clearForm();
        this.incidentId = null;
        this._syncHeader();
    }

    async save() {
        const payload = this.collect();
        const valid = await this.validate(payload);
        if (!valid) return;
        // TODO: wire to scp.set_incident via Core.post('ParameterSQL', ...)
        console.debug('save payload', payload);
        this.isDirty = false;
    }

    async closeIncident(_id) { await this.save(); }

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


        this.resolveDynamicLabels();
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

            const type = sourceInput?.value?.trim();
            if (!type) {
                row.removeAttribute('data-label'); // hides label until value exists
                return;
            }
            const suffix = row.getAttribute('data-label-suffix') || ' ID';
            row.setAttribute('data-label', `${type}${suffix}`);

        });
    }


    collect() {
        // Only gather fields relevant to this pass (contact rel, phones; customer/ref ids; REFERENCE triad; resolution)
        const ids = [
            'ctc-rel', 'ctc-ph', 'ctc-fx',
            'customer-id',
            'reference-type', 'reference-subtype', 'reference-subcode', 'reference-id',
            'res-status',
        ];
        const out = { incidentId: this.incidentId, agentId: this.agentId };
        for (const id of ids) {
            const el = document.getElementById(id);
            if (el) out[id] = el.value;
        }
        return out;
    }

    async validate(_payload) {
        if (!Core.vldt?.validateForm) return true;
        const result = Core.vldt.validateForm('#scp');
        if (!result?.ok) {
            const cfm = Core.buildSnip('cfm');
            await Core.displayAsyncModal(cfm, 'Please correct the highlighted fields.');
            return false;
        }
        return true;
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
            // Clear search result tables
            for (let i = 1; i <= 4; i++) {
                const tbl = document.getElementById(`panel-table-${i}`);
                if (tbl) tbl.innerHTML = '';
            }

            // Reset tabs to first
            const tabs = document.querySelectorAll('.tab');
            const panels = document.querySelectorAll('.pnl');
            tabs.forEach((t, i) => t.classList.toggle('active', i === 0));
            panels.forEach((p, i) => p.classList.toggle('active', i === 0));

            // Reset artifact block
            const art = document.getElementById('art');
            const artId = document.getElementById('art-id');
            const artData = document.getElementById('art-data');
            if (art) art.classList.remove('expanded');
            if (artId) artId.innerHTML = '';
            if (artData) artData.innerHTML = '';
        }

        if (section === 'resolution') {
            const actionSelect = document.getElementById('res-action-code');
            if (actionSelect) actionSelect.selectedIndex = 0;
        }

        // contact/customer don’t have extra artifacts beyond their fields/notepad
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

        this.drawSearch(searchType, ctx);
    }

    async drawSearch(searchType, ctx) {
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

        // this._applySearchSelection(ctx, domain, result.selected);
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
                VENDOR: 'vendorid',          // user-search key
                OTHER: null,
            };

            const key = keyByDomain[domain];
            idInput.value = key ? String(selected[key] ?? '').trim() : '';
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

            // Empty should clear the div so your [data-label]:not(:empty) logic works
            const out = this._formatBindValue(raw, fmt);

            // If later you decide some binds should set input.value, you can extend here.
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
                // placeholder: keep raw for now; plug in your preferred date normalization later
                return s;

            default:
                return s;
        }
    }


    _clearForm() {
        this.clearSection(['contact', 'customer', 'reference', 'resolution']);
        this._clearCategories(['contact', 'customer', 'reference']);
        this._resetSearchUI();
        this._resetIncidentNotepad()

        this.isDirty = false;
        this.incidentId = null;
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

    async _fetchCsiNo() {
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
            const row = Array.isArray(result) ? result[0] : result;
            const csino = row?.CSINO ?? row?.csino ?? null;

            if (!csino) {
                Core.error?.('[incident] No CSINO returned from scp.get_next_csino', { result });
                return null;
            }

            this.incidentId = String(csino); 

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

        const now = new Date();

        // CSINO
        const csino = await this._fetchCsiNo();

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
        if (this._contactInitializing) return;
        this._contactInitializing = true;

        try {
            await this._initiateContact();
        } finally {
            this._contactInitializing = false;
        }
    }


    async _ensureTimer() {
        if (this._timerStarted) return;
        this._timerStarted = true;

        // Initialize incident (CSINO, open date, 0:00:00, assigned user)
        await this._initiateContact();

        // If _initiateContact didn’t set timerStart, set it now
        if (!this.timerStart) {
            this.timerStart = Date.now();
        }

        this.timerHandle = setInterval(() => this._tick(), 1000);
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
                // cancelled picker; leave current values as-is
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
        // matches: [{ typeCode, typeDesc, subCode, subDesc }, ...]
        if (!matches.length) return null;

        const rows = matches.map(m => [
            m.typeCode,
            m.typeDesc,
            m.subCode,
            m.subDesc,
        ]);

        const headers = ['Type Code', 'Type', 'Sub Code', 'Subtype'];
        const tableId = 'ref-dup-table';

        const snip = document.createElement('div');
        snip.id = 'type-picker';

        snip.innerHTML = '';

        const header = document.createElement('h2');
        header.textContent = 'Select Type';
        snip.appendChild(header);

        const table = Core.buildTable(rows, headers, tableId);
        snip.appendChild(table);

        Core.drawModal(snip, '800px');

        return new Promise((resolve) => {
            Core.addTrListener(tableId, 'click', (row) => {
                const idx = row.rowIndex - 1; // account for header row

                // Safety guard in case id isn't set or is weird
                if (Number.isNaN(idx) || idx < 0 || idx >= matches.length) {
                    console.warn('[Incident] _chooseSubcode: invalid row id', row.id);
                    return;
                }

                const chosen = matches[idx];
                Core.dismissModal();
                resolve(chosen);
            });

        });
    }


    _isValidSubcode(ctx, valueOverride) {
        const type = document.getElementById(`${ctx}-type`)?.value;
        const subtype = document.getElementById(`${ctx}-subtype`)?.value;
        const val = ((valueOverride ?? document.getElementById(`${ctx}-subcode`)?.value) || '').trim();
        if (!type || !subtype || !val) return false;
        const codes = this.categories[ctx]?.byType?.[type]?.bySubtype?.[subtype] || [];
        return codes.includes(val);
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

    // incident is ancestor for collection and detail

    // -----------------------------------------
    // 1) Blueprint factory (domain-aware)
    // -----------------------------------------
    _buildRefBlueprint(domain) {
        const D = String(domain || '').toUpperCase();

        if (D === 'MEMBER') {
            return {
                tabs: [
                    {
                        key: 'elig',
                        label: 'Eligibility',
                        panel: {
                            kind: 'table',
                            sp: 'scp.get_member_eligibility',
                            params: (mbrId) => [{ name: '@p_mbrno', value: mbrId }],
                            rowCountInTab: true,
                            selectable: false,
                            sortable: true,
                        },
                        // no detail
                    },
                    {
                        key: 'auth',
                        label: 'Authorizations',
                        panel: {
                            kind: 'table',
                            sp: 'scp.get_member_authorization',
                            params: (mbrId) => [{ name: '@p_mbrno', value: mbrId }],
                            rowCountInTab: true,
                            selectable: true,
                            sortable: true,
                        },
                        detail: {
                            sp: 'scp.get_auth_detail',
                            params: (authNo) => [{ name: '@p_authno', value: authNo }],
                            snip: 'aut',
                            canChoose: true,
                        },
                    },
                    {
                        key: 'claim',
                        label: 'Claims',
                        panel: {
                            kind: 'table',
                            sp: 'scp.get_member_claim',
                            params: (mbrId) => [{ name: '@p_mbrno', value: mbrId }],
                            rowCountInTab: true,
                            selectable: true,
                            sortable: true,
                        },
                        detail: {
                            sp: 'scp.get_claim_detail',
                            params: (claimNo) => [{ name: '@p_claimno', value: claimNo }],
                            snip: 'clm',
                            canChoose: true,
                        },
                    },
                    {
                        key: 'inc',
                        label: 'Incidents',
                        panel: {
                            kind: 'table',
                            sp: 'scp.get_member_incident',
                            params: (mbrId) => [{ name: '@p_mbrno', value: mbrId }],
                            rowCountInTab: true,
                            selectable: true,
                            sortable: true,
                        },
                        detail: {
                            sp: 'scp.get_inc_detail',
                            params: (csiNo) => [{ name: '@p_csino', value: csiNo }],
                            snip: 'inc',
                            canChoose: false, 
                        },
                    },
                ],
            };
        }

        // TODO: PROVIDER/VENDOR variants
        return { tabs: [] };
    }

    // -----------------------------------------
    // 2) DI: TableSQL + helpers (Core boundary)
    // -----------------------------------------
    _buildClctIO() {
        return {
            postTable: async (sp, params) => {
                // TableSQL adapter: YOU own the payload schema.
                // If you already have a helper, use it here.
                const payload = {
                    spName: sp,
                    parameters: (params || []).map(p => ({
                        Key: p.name,
                        Value: p.value,
                        Type: 'varchar', // adjust if you have typing
                    })),
                };

                // Core.post signature in your environment may differ;
                // swap this call to your exact wrapper.
                const html = await Core.post('TableSQL', payload);
                return String(html || '');
            },

            buildSnip: (snipId) => Core.buildSnip(snipId),

            // Native helpers you said you want to leverage
            makeTableSortable: (tableId) => Core.makeTableSortable?.(tableId),
            addTrListener: (tableId, evt, handler) => Core.addTrListener?.(tableId, evt, handler),

            // row highlight + row count (if present); otherwise clct skeleton fallback handles it
            highlightRow: (tableId, row) => Core.highlightTableRow?.(tableId, row),
            getTableRowCount: (tableId) => Core.getTableRowCount?.(tableId),
        };
    }

    // -----------------------------------------
    // 3) Clct + Detl orchestration state
    // -----------------------------------------
    _initReferenceCollectionSystem() {
        this._clct = null;
        this._detl = null;

        // track what the ancestor considers "chosen"
        this._chosen = {
            artifactType: '',
            artifactId: '',
        };
    }

    // Called when Reference ID resolves to a subject (after peek/search)
    async showReferenceCollections({ domain, subjectId }) {
        const host = document.querySelector('.clct');  // your simplified markup
        const detlHost = document.querySelector('.detl'); // sibling in ancestor
        if (!host || !detlHost) return;

        // Build blueprint based on domain
        const blueprint = this._buildRefBlueprint(domain);

        // Destroy old clct + detl (new subject => reset everything)
        this._detl?.destroy?.();
        this._detl = null;

        this._clct?.destroy?.();
        this._clct = null;

        // Instantiate clct
        this._clct = new Clct({
            host,
            blueprint,
            //io: this._buildClctIO(), // DI of buildSnip
            callbacks: {
                onFocusChanged: (focus) => {
                    // Selecting a new row clears whatever was "chosen",
                    // but does NOT build new detl.
                    if (this._chosen.artifactId) {
                        this._clearChosenReference(); // updates notepad + internal state
                    }
                    // detl remains as-is (your rule).
                },

                onShowDetail: (req) => {
                    // Only Show Detail destroys + rebuilds detl
                    this._showDetail(detlHost, req);
                },
            },
        });

        await this._clct.build(subjectId);
    }

    // -----------------------------------------
    // 4) Detail show/build/destroy
    // -----------------------------------------
    async _showDetail(detlHost, req) {
        // Show Detail implies "chosen" is cleared (your rule)
        if (this._chosen?.artifactId) {
            this._clearChosenReference();
        }

        // Singleton detl
        if (this._detl?.destroy) this._detl.destroy();
        this._detl = null;

        const bp = this._buildDetlBlueprint(req);
        const ctx = this._buildDetlContext(req);
        const io = this._buildDetlIO();

        this._detl = new Detl({
            host: detlHost,
            blueprint: bp,
            ctx,
            io,
            callbacks: {
                onChoose: (choice) => {
                    // ancestor records choice; detl collapses itself internally
                    // use clct’s stable identifiers (tabKey/rowId), not req.key
                    this._setChosenReference(req.tabKey, req.rowId);
                },
                onClear: () => {
                    // clears choice; detl clears itself; ancestor drops reference
                    this._clearChosenReference();
                    this._detl = null;
                },
                onClose: () => {
                    // just closes detl
                    this._detl = null;
                },
            },
        });

        await this._detl.build();
    }


    // -----------------------------------------
    // 5) Ancestor "chosen" helpers (notepad update)
    // -----------------------------------------
    _setChosenReference(artifactType, artifactId) {
        this._chosen.artifactType = String(artifactType || '').toUpperCase();
        this._chosen.artifactId = String(artifactId || '');

        // Update notepad reference fields (your ids may differ)
        // Example: reference_artifact_type, reference_artifact_identifier
        this._setNotepadValue('reference.artifactType', this._chosen.artifactType);
        this._setNotepadValue('reference.artifactId', this._chosen.artifactId);

        // anything else: update incident model, etc.
    }

    _clearChosenReference() {
        this._chosen.artifactType = '';
        this._chosen.artifactId = '';

        this._setNotepadValue('reference.artifactType', '');
        this._setNotepadValue('reference.artifactId', '');
    }

    _setNotepadValue(fieldPath, value) {
        // You already have syncNotepadField; this is a generic setter for data-field divs.
        const el = document.querySelector(`[data-field="${fieldPath}"]`);
        if (!el) return;
        el.textContent = String(value ?? '').trim();
    }

    _buildDetlBlueprint(req) {
        return {
            header: {
                label: req.label,
                // optional: show selected id in header, etc.
            },

            data: {
                snipId: req.detail.snip,          // e.g. 'clm', 'aut', 'inc'
                sp: req.detail.sp,               // ParameterSQL proc
                params: (ctx) => req.detail.params(ctx.rowId),
                canChoose: !!req.detail.canChoose,
            },

            // Button policy: detl injects buttons, blueprint suppresses
            buttons: {
                showChoose: !!req.detail.canChoose,
                showClear: true,   // becomes visible after choose (detl state)
                showClose: true,   // always available when not choosable OR when not chosen
            },
        };
    }

    _buildDetlContext(req) {
        return {
            key: req.key,          // tab key: 'claim' | 'auth' | 'elig' | ...
            label: req.label,      // tab label
            rowId: req.rowId,      // selected table row id (record identifier)
            // optional: subjectId/domain for logging only
        };
    }

    _buildDetlIO() {
        return {
            buildSnip: (snipId) => Core.buildSnip(snipId),

            postParam: async (sp, params) => {
                const payload = {
                    spName: sp,
                    parameters: (params || []).map(p => ({
                        Key: p.name,
                        Value: p.value,
                        Type: 'varchar',
                    })),
                };

                const rows = await Core.post('ParameterSQL', payload);
                return Array.isArray(rows) ? rows : (rows?.rows || []);
            },
        };
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
        console.log('[Incident] select subject', { ctx, domain, keyId });

        const detail = await this._getSubjectDetail(domain, keyId);

        if (!detail) {
            console.warn('[Incident] no detail returned', { domain, keyId });
            return;
        }

        this._applySearchSelection(ctx, domain, detail);
    }
}

