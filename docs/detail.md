# Application Detail

`wwwroot/js/modules/detail.js` retrieves one claim, authorization, or incident and assembles its supporting tables for the existing Core `Detl` renderer. Procedure names, parameter names, binding keys, and choice policy live in `contracts/detail-contracts.js`. Core and the database are unchanged.

```js
import { Detail } from './detail.js';

const detail = new Detail({
    host: detailHost,
    onChoose: ({ type, id }) => incident.setReference(type, id),
    onClear: () => incident.clearReference(),
});
await detail.show({ type: 'claim', id: claimNumber });
// Other supported types: 'authorization', 'incident'.
// Dispose when the owning incident workspace closes:
detail.destroy();
```

The callback method names above illustrate the owner's responsibilities; they are not implemented Incident methods. This class is not yet connected to Incident's collection callbacks. Eligibility remains a collection; conditions have no detail view.

## Retrieval and lifecycle

`show` validates the type, ID, and snippet before replacing the display. It then clears the previous display and association through `onClear`, retrieves exactly one matching header with `ParameterSQL`, and retrieves supporting sections with `TableSQL`. Claims and authorizations become choosable only after all requests and rendering succeed. `onChoose` returns a frozen `{ type: 'Claim' | 'Authorization', id }` captured for that display. Incident detail has no Choose button.

The returned promise resolves `true` when displayed, or `false` after retrieval/rendering failure or supersession. Invalid configuration rejects. Retrieval failures show a message and Retry button; no partial artifact is choosable. `clear` removes the display and invokes `onClear`. `destroy` also permanently prevents further `show` calls. Replacement, clear, and destruction invalidate outstanding work without cancelling the underlying requests.

Each request builds Core Detl inside a fresh detached shell. Only the current request can attach its shell or invoke the owner's callbacks. This protects against an earlier Core build completing after the user closes or replaces the view.

## Layout contract

Provide application snippets named `clm`, `aut`, and `inc`, each containing `data-bind` slots. The local app 10 snippet catalog did not contain these layouts when this class was developed; no catalog writes were performed. Configuration and Incident wiring remain integration work.

Header slots use the exact column aliases from the supplied procedures. Extra returned columns are ignored. Missing values become empty text; the application's existing `data-label`/`:empty` CSS controls labels. This does not introduce group-level hiding or change the database layouts.

Supporting table slots use these application keys:

| Artifact | Supporting bindings |
| --- | --- |
| Claim | `diagnoses`, `notes`, `references`, `relatedIncidents`, `services`, `processingStatus`, `duplicates` |
| Authorization | `diagnoses`, `notes`, `references`, `relatedIncidents`, `inpatient`, `services`, `claimReferences` |
| Incident | `notes` |

An empty response or table with no body rows leaves the slot empty. A single body row is displayed. Table HTML retains the existing server-rendered table contract. Specific scalar columns returned as span/title markup are converted to text and a tooltip in the application; other scalar fields use Core's ordinary text binding.

The supplied `scp.get_claim_detail.sql`, `scp.get_authorization_detail.sql`, `scp.get_authorization_inpatient_detail.sql`, and `scp.get_incident_detail.sql` establish header projections and parameters. Supporting procedure parameters were checked against the SQL repository. No SQL scripts were executed and no production records were retrieved.

## Verification

Run `node tests/detail.browser.cjs` with Playwright resolvable through `NODE_PATH`, Edge installed, and `CORE_ROOT` pointing to a core-service checkout with its TypeScript dependency installed. The test serves synthetic records and transpiles the current Core Detl source for a real headless Edge browser. It covers rendering, choice identity, non-choosable incidents, tooltips, empty slots, replacement/clear/destruction races, and failure recovery. It does not verify the live database layouts or full Incident workflow.

## Core observations for discussion

Core Detl currently lacks cancellation/generation handling for asynchronous builds; the application isolates those builds. Its scalar binder treats SQL span markup as text; the application adapts the known domain columns before binding. Neither observation requires changing Core's API for this class.
