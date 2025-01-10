export const arrayReducer = (actions) => (state, { type, payload }) => {
  switch (type) {
    case actions.add:
      return [...state, ...(Array.isArray(payload) ? payload : [payload])];
    case actions.new:
      return payload;
    case actions.del:
      return state.filter((v) => payload !== v.id);
    case actions.upd:
      return state.map((v) => (v.id === payload.id ? payload : v));
    default:
      return state;
  }
};
