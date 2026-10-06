/** Application-owned adapter for the insert-only scp.set_incident contract. */
const fields = Object.freeze({
    "contact_category": "contact.category",
    "incident_open_date": "incident.openDate",
    "incident_close_date": "incident.closeDate",
    "ctc_start": "incident.startTime",
    "ctc_elapsed": "incident.elapsed",
    "ctc_first_name": "contact.firstName",
    "ctc_last_name": "contact.lastName",
    "ctc_relation": "contact.relationship",
    "ctc_phone": "contact.phone",
    "ctc_fax": "contact.fax",
    "ctc_email": "contact.email",
    "ctc_note": "contact.reason",
    "customer_category": "customer.category",
    "cust_mbr_id": "customer.memberNumber",
    "cust_mbr_last_name": "customer.memberLastName",
    "cust_mbr_first_name": "customer.memberFirstName",
    "cust_mbr_birthdate": "customer.memberBirthdate",
    "cust_mbr_sex": "customer.memberSex",
    "cust_mbr_language": "customer.memberLanguage",
    "cust_mbr_address": "customer.memberAddress",
    "cust_prv_id": "customer.providerId",
    "cust_prv_last_name": "customer.providerLastName",
    "cust_prv_first_name": "customer.providerFirstName",
    "cust_prv_tax_id": "customer.providerTaxId",
    "cust_prv_npi": "customer.providerNpi",
    "cust_prv_full_name": "customer.providerFullName",
    "cust_prv_address": "customer.providerAddress",
    "cust_ven_id": "customer.vendorId",
    "cust_ven_last_name": "customer.vendorLastName",
    "cust_ven_first_name": "customer.vendorFirstName",
    "cust_ven_tax_id": "customer.vendorTaxId",
    "cust_ven_npi": "customer.vendorNpi",
    "cust_ven_full_name": "customer.vendorFullName",
    "cust_ven_address": "customer.vendorAddress",
    "cust_hpl_abbr": "customer.healthplanAbbr",
    "cust_hpl_name": "customer.healthplanName",
    "cust_other": "customer.other",
    "cst_note": "customer.note",
    "reference_category": "reference.category",
    "reference_artifact_type": "reference.artifactType",
    "reference_artifact_identifier": "reference.artifactId",
    "ref_mbr_id": "reference.memberNumber",
    "ref_mbr_last_name": "reference.memberLastName",
    "ref_mbr_first_name": "reference.memberFirstName",
    "ref_mbr_birthdate": "reference.memberBirthdate",
    "ref_mbr_sex": "reference.memberSex",
    "ref_mbr_language": "reference.memberLanguage",
    "ref_mbr_address": "reference.memberAddress",
    "ref_prv_id": "reference.providerId",
    "ref_prv_last_name": "reference.providerLastName",
    "ref_prv_first_name": "reference.providerFirstName",
    "ref_prv_tax_id": "reference.providerTaxId",
    "ref_prv_npi": "reference.providerNpi",
    "ref_prv_full_name": "reference.providerFullName",
    "ref_prv_address": "reference.providerAddress",
    "ref_ven_id": "reference.vendorId",
    "ref_ven_last_name": "reference.vendorLastName",
    "ref_ven_first_name": "reference.vendorFirstName",
    "ref_ven_tax_id": "reference.vendorTaxId",
    "ref_ven_npi": "reference.vendorNpi",
    "ref_ven_full_name": "reference.vendorFullName",
    "ref_ven_address": "reference.vendorAddress",
    "ref_other": "reference.other",
    "ref_type": "reference.type",
    "ref_sub_type": "reference.subtype",
    "ref_type_abbr": "reference.subtypeCode",
    "ref_note": "reference.note",
    "res_priority": "resolution.priority",
    "res_status": "resolution.status",
    "res_result": "resolution.result",
    "res_action_abbr": "resolution.actionAbbr",
    "res_action_code": "resolution.actionCode",
    "res_assign": "resolution.responsiblePerson",
    "res_note": "resolution.note"
});

export class IncidentPersistence {
    constructor({ post }) { this.post = post; }

    collect(root, { incidentId, agentId, userId, timerStart, chosen }, now = Date.now()) {
        const payload = {};
        for (const [key, field] of Object.entries(fields)) {
            const slot = root.querySelector('[data-field="' + field + '"]');
            const control = root.querySelector('[name="' + field + '"]:not([type="radio"])');
            const radio = root.querySelector('[name="' + field + '"]:checked');
            if (radio && field !== 'reference.category') payload[key] = radio.labels?.[0]?.textContent.trim() || radio.value;
            else if (control) payload[key] = control.tagName === 'SELECT' ? (control.selectedOptions[0]?.textContent || '') : control.value;
            else payload[key] = slot?.textContent?.trim() || '';
        }
        payload.incident_number = String(incidentId || '');
        payload.ezcapuser = agentId || '';
        payload.ezcapuserid = userId ? Number(userId) : null;
        if (timerStart) {
            const start = new Date(timerStart);
            payload.incident_open_date = localDate(start);
            payload.ctc_start = [start.getHours(),start.getMinutes(),start.getSeconds()].map(pad).join(':');
            const elapsed = Math.max(0,Math.floor((now-timerStart)/1000));
            payload.ctc_elapsed = [Math.floor(elapsed/3600),Math.floor(elapsed/60)%60,elapsed%60].map(pad).join(':');
        }
        payload.incident_close_date = calendarDate(payload.incident_close_date);
        if (payload.incident_open_date) payload.incident_open_date = calendarDate(payload.incident_open_date);
        const type = String(chosen?.artifactType || payload.reference_artifact_type || '').toUpperCase();
        payload.reference_artifact_type = ({CLAIMS:'Claim',CLAIM:'Claim',AUTHORIZATIONS:'Authorization',AUTHORIZATION:'Authorization'})[type] || '';
        payload.reference_artifact_identifier = String(chosen?.artifactId || payload.reference_artifact_identifier || '');
        payload.ref_artifact_type = payload.reference_artifact_type;
        payload.incident_priority = payload.res_priority;
        payload.incident_status = payload.res_status;
        // Lookup stores the action code separately from its displayed description.
        const action = root.querySelector('#res-action-code');
        if (action) payload.res_action_abbr = action.dataset.code || payload.res_action_abbr;
        return payload;
    }

    errors(payload) {
        const errors = [];
        const required = {contact_category:'Contact Type',ctc_first_name:'First Name',ctc_last_name:'Last Name',customer_category:'Customer',reference_category:'Reference',ref_type:'Type',ref_sub_type:'Subtype',ref_type_abbr:'Subtype Code',res_priority:'Priority',res_status:'Status',res_result:'Result',res_action_abbr:'Action Code',res_action_code:'Action',ezcapuser:'Agent'};
        for (const [key,label] of Object.entries(required)) if (!String(payload[key] ?? '').trim()) errors.push('Provide ' + label + '.');
        for (const [prefix,category] of [['cust',payload.customer_category],['ref',payload.reference_category]]) {
            const suffix = {MEMBER:'mbr_id',PROVIDER:'prv_id',VENDOR:'ven_id',HEALTHPLAN:'hpl_abbr',OTHER:'other'}[String(category || '').replace(/ /g,'').toUpperCase()];
            if (!suffix || !String(payload[prefix+'_'+suffix] || '').trim()) errors.push('Select a valid ' + (prefix === 'cust' ? 'customer' : 'reference') + '.');
        }
        if (!payload.incident_number || !payload.incident_open_date || !payload.ctc_start || !payload.ctc_elapsed) errors.push('The incident number and contact timer must be initialized.');
        if (!Number.isInteger(payload.ezcapuserid) || payload.ezcapuserid <= 0) errors.push('Your user ID is missing. Sign in again before saving.');
        if (payload.reference_artifact_identifier && !payload.reference_artifact_type) errors.push('Only a claim or authorization can be associated.');
        return errors;
    }

    async insert(payload) {
        const result = await this.post('ParameterSQL', { spName:'scp.set_incident', parameters:[{Key:'@p_csi_data',Value:JSON.stringify(payload),Type:'varchar'}] });
        const row = Array.isArray(result) ? result[0] : result?.rows?.[0] || result?.recordset?.[0] || result;
        if (!row || row.csm_error == null || String(row.csm_error) !== '0' || !row.incident_number) {
            throw new Error(row?.csm_return_value || row?.proc_err_message || 'The server did not confirm that the incident was created.');
        }
        return { incidentNumber:String(row.incident_number), message:String(row.csm_return_value || '') };
    }
}
function pad(value) { return String(value).padStart(2,'0'); }
function localDate(date) { return [date.getFullYear(),pad(date.getMonth()+1),pad(date.getDate())].join('-'); }
function calendarDate(value) {
    if (!value) return null;
    const text=String(value).trim();
    const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    const us=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    const parts=iso ? [+iso[1],+iso[2],+iso[3]] : us ? [+us[3],+us[1],+us[2]] : null;
    if (!parts) throw new Error('The incident date is invalid.');
    const [year,month,day]=parts; const date=new Date(year,month-1,day);
    if(date.getFullYear()!==year || date.getMonth()!==month-1 || date.getDate()!==day) throw new Error('The incident date is invalid.');
    return [year,pad(month),pad(day)].join('-');
}
