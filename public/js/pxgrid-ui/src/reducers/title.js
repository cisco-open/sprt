export const titleReducer = (state = null, action) => {
    switch (action.type) {
        case 'SET_TITLE':
            return action.payload;
        default:
            return state;
    }
}