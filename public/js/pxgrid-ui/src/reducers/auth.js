const INITIAL_STATE = {
    isSigned: null,
    username: null,
    displayName: null,
    userId: null,
    provider: null,
    methods: null
}

export const authReducer = (state = INITIAL_STATE, action) => {
    switch (action.type) {
        case 'USER_SIGNED':
            return { ...action.payload, isSigned: true };
        case 'USER_NOT_SIGNED':
            return { ...INITIAL_STATE, ...action.payload, isSigned: false };
        default:
            return state;
    }
}

export const sessionCheckReducer = (state = null, action) => {
    switch (action.type) {
        case 'SESSION_CHECK':
            return true;
        case 'USER_SIGNED':
        case 'USER_NOT_SIGNED':
            return false;
        default:
            return state;
    }
}