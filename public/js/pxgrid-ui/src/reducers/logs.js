const INITIAL = [];

export const logsReducer = (state = INITIAL, action) => {
  switch (action.type) {
    case "GOT_LOGS":
      return action.payload;
    case "REMOVED_LOGS":
      return INITIAL;
    case "LOADING_LOGS":
      return ["loading"];
    case "BLOCKED_LOGS":
      return ["blocked"];
    default:
      return state;
  }
};
