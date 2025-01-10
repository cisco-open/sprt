import axios from "axios";

const loadingLogs = () => {
  return {
    type: "LOADING_LOGS"
  };
};

const blockedLogs = () => {
  return {
    type: "BLOCKED_LOGS"
  };
};

const gotLogs = data => {
  return {
    type: "GOT_LOGS",
    payload: data
  };
};

const removedLogs = data => {
  return {
    type: "REMOVED_LOGS",
    payload: data
  };
};

export const fetchLogs = (connection, position, perPage) => async dispatch => {
  dispatch(loadingLogs());

  const response = await axios.post(
    `/pxgrid/connections/${connection}/logs`,
    { position, perPage },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    }
  );

  await dispatch(gotLogs(response.data));
};

export const clearLogs = connection => async dispatch => {
  dispatch(blockedLogs());

  const response = await axios.delete(
    `/pxgrid/connections/${connection}/logs`,
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    }
  );

  await dispatch(removedLogs(response));
};
