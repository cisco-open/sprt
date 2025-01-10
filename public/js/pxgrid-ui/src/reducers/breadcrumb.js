export const breadcrumbReducer = (state = [], action) => {
    if ( !action.payload ) { return state; }
    switch (action.type) {
        case 'ADD_BREADCRUMB':
            return [...state, action.payload];
        case 'REMOVE_BREADCRUMB':
            return state.filter(crumb => crumb.name !== action.payload);
        case 'REMOVE_BREADCRUMB_LAST':
            return state.slice(0, -1);
        case 'REMOVE_BREADCRUMB_FROM':
            let idx = state.findIndex(c => c.name === action.payload);
            idx = idx >= 1 ? idx : 1;
            return state.slice(0, idx);
        default:
            return state;
    }
}