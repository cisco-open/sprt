import { actionType } from "./types";

export const prepareValues = (values, _server, _bulk, toUpdate, action) => {
  switch (action) {
    case actionType.update: {
      const {
        "acct-session-time-type": type,
        "interim-session-time": time,
        ...rest
      } = values;

      return {
        ...rest,
        async: values.async ? 1 : 0,
        useAnotherServer: values.useAnotherServer ? 1 : 0,
        "interim-session-time": type === "specified" ? time : type,
        sessions: Array.isArray(toUpdate)
          ? toUpdate.length === 1
            ? toUpdate[0].toString()
            : `array:${toUpdate.join(",")}`
          : "all",
      };
    }
    case actionType.drop: {
      const {
        "drop-acct-session-time-type": type,
        "session-time": time,
        ...rest
      } = values;

      return {
        ...rest,
        async: values.async ? 1 : 0,
        useAnotherServer: values.useAnotherServer ? 1 : 0,
        "session-time": type === "specified" ? time : type,
        sessions: Array.isArray(toUpdate)
          ? toUpdate.length === 1
            ? toUpdate[0].toString()
            : `array:${toUpdate.join(",")}`
          : "all",
      };
    }
    default:
      return values;
  }
};
