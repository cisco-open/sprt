import setWith from "lodash/setWith";
import clone from "lodash/clone";

const INITIAL = {
  messages: ["loading"],
  total: -1,
  position: 1,
  perPage: 25,
  loading: false
};

export const messagesReducer = (state = INITIAL, action) => {
  switch (action.type) {
    case "GOT_MESSAGES":
      return {
        ...action.payload,
        loading: false
      };
    case "LOADING_MESSAGES":
      return {
        ...(state || INITIAL),
        loading: true
      };
    case "READ_MESSAGE":
      const { id } = action.payload;
      const idx = state.messages.findIndex(msg => msg.id == id);
      return setWith(clone(state), ["messages", idx, "viewed"], true, clone);
    default:
      return state;
  }
};
