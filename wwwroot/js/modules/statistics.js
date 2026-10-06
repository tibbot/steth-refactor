// @ts-nocheck
import * as Core from 'http://localhost/core-service/';

/** Today's incidents for the current agent, with latest-note inspection. */
export class Statistics {
    constructor() {
        this.generation = 0;
        this.handle = null;
        this.loading = false;
    }

    async show() {
        if (this.handle || this.loading) return;
        const username = Core.getCookie('pEL')?.trim();
        if (!username) {
            await Core.displayAsyncModalSettled(Core.buildSnip('msg'), 'Sign in to view Statistics.');
            return;
        }
        const generation = ++this.generation;
        const body = document.createElement('div');
        body.className = 'statistics';
        body.style.maxHeight = '60vh'; body.style.overflow = 'auto';
        body.setAttribute('aria-live', 'polite');
        body.textContent = 'Loading today’s incidents…';
        const close = document.createElement('button'); close.type = 'button'; close.className = 'lbn'; close.textContent = 'Close';
        const title = document.createElement('h2'); title.textContent = 'Statistics';
        this.handle = Core.drawDialog({ title, body, footer: close, className: 'modl-wide', scrollable: true,
            onClose: () => { if (generation === this.generation) { this.generation++; this.handle = null; this.loading = false; } },
        });
        close.onclick = () => this.handle?.close('close');
        this.loading = true;
        try {
            const records = await this._rows('scp.get_incident_by_agent', '@p_user_name', username);
            if (generation !== this.generation) return;
            this._render(body, records, generation);
        } catch (error) {
            if (generation === this.generation) body.textContent = `Unable to retrieve Statistics: ${error.message}`;
        } finally { if (generation === this.generation) this.loading = false; }
    }

    async _rows(procedure, parameter, value) {
        const result = await Core.post('ParameterSQL', {
            spName: procedure, parameters: [{Key:parameter,Value:value,Type:'varchar'}],
        });
        if (result == null || result === '') return [];
        const records = Array.isArray(result) ? result : result.rows || result.recordset || result.result;
        if (!Array.isArray(records)) throw new Error('The server did not return a recordset.');
        return records;
    }

    _render(body, records, generation) {
        body.replaceChildren();
        if (!records.length) { body.textContent = 'No incidents created today.'; return; }
        const summary = document.createElement('p'); summary.textContent = `${records.length} incident${records.length === 1 ? '' : 's'} today. Select a row to view its latest note.`;
        summary.style.marginBottom = '1rem'; body.append(summary);
        const columns = ['Incident Number','Contact','Initiated','Contact Type','Priority','Status','Result','Assigned To'].map(key => ({key,label:key,sortable:true,sortType:key==='Initiated'?'number':'text'}));
        const rows = records.map((record,index) => ({...record,_displayKey:`agent-incident-${index}`}));
        const table = Core.buildRecordTable(rows, {id:'agentIncident-table',rowId:row=>row._displayKey,columns});
        table.tHead.style.position = 'sticky'; table.tHead.style.top = '0'; table.tHead.style.background = 'var(--default-background-color)';
        Array.from(table.tBodies[0].rows).forEach((row,index) => {
            const record = rows[index];
            const id = String(record.stethoscope_key ?? record['Incident Number'] ?? '');
            row.dataset.incidentId = id; row.tabIndex = 0;
            row.cells[2].dataset.sortValue = timestamp(record.Initiated);
            row.addEventListener('click', () => { void this._showNote(id,generation); });
            row.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void this._showNote(id,generation); }
            });
        });
        Core.makeTableSortable(table); body.append(table);
    }

    async _showNote(id, generation) {
        if (this.loading || !id || generation !== this.generation) return;
        this.loading = true;
        try {
            const records = await this._rows('scp.get_last_incident_note','@p_CSINO',id);
            if (generation !== this.generation) return;
            const note = String(records[0]?.NOTES ?? '').trim();
            // Wait for the statistics dialog to finish closing before replacing it.
            const handle = this.handle;
            const closed = new Promise(resolve => handle.dialog.addEventListener('close',resolve,{once:true}));
            handle.close('note'); await closed;
            if (this.generation !== generation + 1) return;
            await this._noteDialog(note);
        } catch (error) {
            if (generation === this.generation) {
                const message = document.createElement('p'); message.setAttribute('role','alert'); message.textContent = `Unable to retrieve the incident note: ${error.message}`;
                this.handle.dialog.querySelector('.statistics')?.prepend(message);
            }
        } finally { if (generation === this.generation) this.loading = false; }
    }

    async _noteDialog(note) {
        const generation = ++this.generation;
        const body = document.createElement('div');
        const text = document.createElement('pre'); text.textContent = note || 'No note available.'; text.style.whiteSpace = 'pre-wrap'; text.style.overflowWrap = 'anywhere'; text.style.fontFamily = 'var(--form-font)'; body.append(text);
        const feedback = document.createElement('p'); feedback.setAttribute('role','status'); body.append(feedback);
        const footer = document.createElement('div'); footer.className = 'button-container';
        const close = document.createElement('button'); close.type='button';close.className='lbn';close.textContent='Close';footer.append(close);
        const title = document.createElement('h2');title.textContent='Incident Note';
        this.handle = Core.drawDialog({title,body,footer,className:'modl-wide',scrollable:true,
            onClose:()=>{if(generation===this.generation){this.generation++;this.handle=null;this.loading=false;}},
        });
        close.onclick=()=>this.handle?.close('close');
        if (note && window.isSecureContext && navigator.clipboard?.writeText) {
            const copy=document.createElement('button');copy.type='button';copy.className='lbn';copy.textContent='Copy';footer.prepend(copy);
            copy.onclick=async()=>{
                copy.disabled=true;
                try { await navigator.clipboard.writeText(note);feedback.textContent='Copied.'; }
                catch { feedback.textContent='Unable to copy. You can select and copy the note manually.'; }
                finally { copy.disabled=false; }
            };
        }
    }
}

function timestamp(value) {
    const match=/^(\d{2})\/(\d{2})\/(\d{4}) (\d{1,2}):(\d{2}) (AM|PM)$/i.exec(String(value || ''));
    if(!match)return '';
    const [,month,day,year,hour,minute,period]=match;
    if(+hour<1||+hour>12||+minute>59)return '';
    const hours=+hour%12+(period.toUpperCase()==='PM'?12:0);
    const date=new Date(+year,+month-1,+day,hours,+minute);
    return date.getFullYear()===+year&&date.getMonth()===+month-1&&date.getDate()===+day ? String(date.getTime()) : '';
}
