export const BULKS_ACTIONS = {
  NEW: "bulks/new",
  BULK_STATE: "bulks/bulk.state",
  BULK_ATTRIBUTE: "bulks/bulk.attribute"
};

export const bulksReducer = (state, { type, payload }) => {
  switch (type) {
    case BULKS_ACTIONS.NEW:
      return payload;
    case BULKS_ACTIONS.BULK_STATE: {
      const { dropOthers, name, state: newState } = payload;
      return state.map(b => {
        if (b.name === name) return { ...b, state: newState };
        if (dropOthers) return { ...b, state: null };
        return b;
      });
    }
    case BULKS_ACTIONS.BULK_ATTRIBUTE: {
      const { attribute, bulk, value } = payload;
      return state.map(b =>
        b.name === bulk ? { ...b, [attribute]: value } : b
      );
    }
    default:
      return state;
  }
};

export const SELECTION_ACTIONS = {
  ADD: "selection/add",
  DEL: "selection/delete",
  CLEAR: "selection/clear"
};

export const selectionReducer = (state, action) => {
  switch (action.type) {
    case SELECTION_ACTIONS.ADD: {
      if (Array.isArray(action.payload)) {
        return [
          ...state,
          ...action.payload.filter(idx => !state.includes(idx))
        ];
      }
      return state.includes(action.payload)
        ? state
        : [...state, action.payload];
    }
    case SELECTION_ACTIONS.DEL: {
      if (Array.isArray(action.payload)) {
        action.payload
          .filter(idx => state.includes(idx))
          .forEach(idx => state.splice(state.indexOf(idx), 1));
        return [...state];
      }
      if (state.includes(action.payload)) {
        state.splice(state.indexOf(action.payload), 1);
        return [...state];
      }
      return state;
    }
    case SELECTION_ACTIONS.CLEAR:
      return [];
    default:
      return state;
  }
};

export const BLOCK_ACTIONS = {
  ADD: "block/add",
  DEL: "block/delete",
  CLEAR: "block/clear"
};

export const blockReducer = (state, action) => {
  switch (action.type) {
    case BLOCK_ACTIONS.ADD: {
      if (Array.isArray(action.payload)) {
        return [
          ...state,
          ...action.payload.filter(idx => !state.includes(idx))
        ];
      }
      return state.includes(action.payload)
        ? state
        : [...state, action.payload];
    }
    case BLOCK_ACTIONS.DEL: {
      if (Array.isArray(action.payload)) {
        action.payload
          .filter(idx => state.includes(idx))
          .forEach(idx => state.splice(state.indexOf(idx), 1));
        return [...state];
      }
      if (state.includes(action.payload)) {
        state.splice(state.indexOf(action.payload), 1);
        return [...state];
      }
      return state;
    }
    case BLOCK_ACTIONS.CLEAR:
      return [];
    default:
      return state;
  }
};
