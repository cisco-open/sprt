import setWith from "lodash/setWith";
import clone from "lodash/clone";

export const connectionsReducer = (state = [], action) => {
  switch (action.type) {
    case "FETCH_CONNECTIONS":
      return action.payload;
    case "FETCH_CONNECTION":
      var newState = state.filter(c => c.id !== action.payload.id);
      return [...newState, action.payload];
    case "UNREAD_MESSAGES":
      const { client, count } = action.payload;
      const idx = state.findIndex(c => c.id === client);
      if (parseInt(state[idx].messages.unread) !== parseInt(count)) {
        return setWith(
          clone(state),
          [idx, "messages", "unread"],
          count,
          _.clone
        );
      } else {
        return state;
      }
    default:
      return state;
  }
};
