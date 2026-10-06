import { subjectCollection, subjectColumn as col } from './subject-collection-contract.js';

export function createProviderContract() {
    return {
        key: 'provider', label: 'Provider',
        sets: {
            specialties: subjectCollection({
                key: 'specialties', label: 'Specialty',
                procedure: 'scp.get_provider_specialty', parameter: '@p_PROV_KEYID', tableId: 'specialty-table',
                columns: [col('Specialty'), col('Code'), col('Priority'), col('Cert. Date', {sortType:'date',displayFormat:'date'}), col('Verified')],
            }),
            locations: subjectCollection({
                key: 'locations', label: 'Locations',
                procedure: 'scp.get_provider_location', parameter: '@p_PROV_KEYID', tableId: 'location-table',
                columns: [col('Street 1', {format:'html'}), col('Street 2'), col('City'), col('State'), col('Zip'), col('Phone'), col('Fax')],
            }),
        },
    };
}
