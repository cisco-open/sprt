import axios from "axios";

const loadingMessages = () => {
  return {
    type: "LOADING_MESSAGES"
  };
};

const gotMessages = data => {
  return {
    type: "GOT_MESSAGES",
    payload: data
  };
};

const unreadMessages = (client, count) => {
  return {
    type: "UNREAD_MESSAGES",
    payload: { client, count }
  };
};

const readMessage = (client, id) => {
  return {
    type: "READ_MESSAGE",
    payload: { client, id }
  };
};

export const fetchMessages = (
  connection,
  position,
  perPage
) => async dispatch => {
  await dispatch(loadingMessages());

  const response = await axios.post(
    `/pxgrid/connections/${connection}/messages`,
    { position, perPage },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    }
  );

  await dispatch(gotMessages(response.data));
};

export const fetchUnreadMessages = (connection, ws) => async dispatch => {
  let response;
  if (ws) {
    response = {
      data: await new Promise((resolve, reject) => {
        ws.onmessage = e => resolve(JSON.parse(e.data));
        ws.onerror = e => reject(e);
        ws.send(JSON.stringify({ id: connection, action: "messagesUnread" }));
      })
    };
    ws.onmessage = undefined;
    ws.onerror = undefined;
  } else {
    response = await axios.post(
      `/pxgrid/connections/${connection}/messages/unread`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      }
    );
  }

  await dispatch(unreadMessages(connection, response.data.count || 0));
};

export const markMessageRead = (id, connection) => async dispatch => {
  await axios.post(
    `/pxgrid/connections/${connection}/messages/read/${id}`,
    {},
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    }
  );

  await dispatch(readMessage(connection, id));
};

export const deleteMessage = (id, connection) => async (dispatch, getState) => {
  await axios.delete(`/pxgrid/connections/${connection}/messages/${id}`, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    }
  });

  const {
    messages: { position, perPage }
  } = getState();

  await dispatch(fetchMessages(connection, position, perPage));
};
