export const srvToName = (srv) => {
    switch (srv) {
        case 'com.cisco.ise.config.anc':
            return 'ANC configuration';
        case 'com.cisco.endpoint.asset':
            return 'Endpoint Asset';
        case 'com.cisco.ise.mdm':
            return 'MDM';
        case 'com.cisco.ise.config.profiler':
            return 'Profiler configuration';
        case 'com.cisco.ise.pubsub':
            return 'Pubsub';
        case 'com.cisco.ise.radius':
            return 'Radius Failure';
        case 'com.cisco.ise.session':
            return 'Session Directory';
        case 'com.cisco.ise.system':
            return 'System Health';
        case 'com.cisco.ise.trustsec':
            return 'TrustSec';
        case 'com.cisco.ise.config.trustsec':
            return 'TrustSec configuration';
        case 'com.cisco.ise.sxp':
            return 'TrustSec SXP';
        default:
            return srv;
    }
}

export const copyStringToClipboard = (str) => {
    // Create new element
    var el = document.createElement('textarea');
    // Set value (string to be copied)
    el.value = str;
    // Set non-editable to avoid focus and move outside of view
    el.setAttribute('readonly', '');
    el.style = {position: 'absolute', left: '-9999px'};
    document.body.appendChild(el);
    // Select text inside element
    el.select();
    // Copy text to clipboard
    document.execCommand('copy');
    // Remove temporary element
    document.body.removeChild(el);
}