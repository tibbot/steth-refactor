// @ts-nocheck
import * as Core from 'http://localhost/core-service/';
console.log('Stethoscope Core ID:', Core.CORE_INSTANCE_ID);
import { Incident } from './modules/incident.js';


// Core configuration for UI setup and listener mapping
const coreConfig = {
  id: 10,
  abbr: "scp",
  snips: {
    wrp: '',      // Wrapper section defaults to body
    dlg: '',      // dialog for modal
    hdr: 'main',  // Header section goes to main
    mid: 'main',  // Middle section goes to main
    ctc: 'scp',   // Contact section goes to scp
    cst: 'scp',   // Custom section goes to scp
    ref: 'scp',   // Reference section goes to scp
    res: 'scp',   // Resource section goes to scp
    //npi: 'scp',    // testing npi
    npd: 'main',  // Notepad section goes to main
    hdn: 'main',  // Hidden section goes to main (toggles Notepad)
    ftr: 'main'  // Footer section goes to main
  },
  listeners: {
        main: [
            { target: '#menu-icon', event: 'click', handler: Core.toggleMenu },
            { target: '#menu li', event: 'click', handler: Core.handleMenuClick },
            { target: '#scp', event: 'input', handler: Core.handleCaseChange },
            { target: '.menu', event: 'mouseleave', handler: Core.toggleMenu },
            { target: '#mwin', event: 'input', handler: Core.handleCaseChange },
        ], 
  }
};


async function main() {

    // Inject UI structure and styles
    Core.injectCoreCSS();
    Core.initPreferences();
    // Singleton Snip handle
    await Core.buildInterface(coreConfig);



    const Snip = Core.getSnip();

    await Core.authenticateUser();

    // authenticate user
    // const authUser = await Core.authenticateCredential({
    //     authSp: 'cor.get_user_credential'
    // });

    // if (!authUser || authUser.userId <= 0) {
    //     return;
    // }
    // console.log(Snip);

    Core.setAppAsset('app-image', '/img/scp.png');

    // build the app menu
    const menu = new Core.AppMenu({
        trigger: document.getElementById('app-menu-button'),
        items: [
            { action: 'statistics', label: 'Statistics', icon: '🧮' },
            { action: 'preferences', label: 'Preferences', icon: '🎨' },
            // { action: 'parameters', label: 'Parameters', icon: '⚙️' }
        ],
        onAction: action => {
            switch (action) {
                case 'preferences':
                    Core.showPreferences('prf');
                    break;
                case 'statistics':
                    // TODO: migrate showStatistics
                    break;
                default:
                    callbackMap[action]?.();
                    break;
            }
        }
    });


    (async () => {
        const incident = new Incident({ snip: Snip });
        await incident.init();
    })();
}

main();