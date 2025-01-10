import axios from "axios";

export const fetchConnectionsAction = data => {
  return {
    type: "FETCH_CONNECTIONS",
    payload: data
  };
};

export const fetchConnectionAction = data => {
  return {
    type: "FETCH_CONNECTION",
    payload: data
  };
};

export const fetchConnection = url => async dispatch => {
  const response = await axios.get(url, {
    headers: { Accept: "application/json" }
  });

  if (response.status == 200) {
    dispatch(fetchConnectionAction(response.data));
  }
};

export const fetchConnections = () => async dispatch => {
  const response = await axios.get("/pxgrid/connections/get-connections", {
    headers: { Accept: "application/json" }
  });

  if (response.status == 200) {
    dispatch(fetchConnectionsAction(response.data));
  }
};

export const createConnection = formValues => async dispatch => {
  var formData = new FormData();

  for (var key in formValues) {
    if (Array.isArray(formValues[key])) {
      for (const anotherVal of formValues[key]) {
        formData.append(key, anotherVal);
      }
    } else {
      formData.append(key, formValues[key]);
    }
  }

  // let response =
  await axios.post("/pxgrid/connections/create-connection", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Accept: "application/json"
    }
  });

  // if ( response.status === 204 ) {
  //     dispatch(fetchConnections());
  // }
};

export const deleteConnection = link => async dispatch => {
  await axios.delete(link, {
    Accept: "application/json"
  });

  dispatch(fetchConnections());
};

export const makeServicesREST = (
  connection,
  service,
  call,
  data
) => async dispatch => {
  const response = await axios.post(
    `/pxgrid/connections/${connection}/service/${service}/${call}`,
    data,
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    }
  );

  await dispatch(fetchConnections());
  return response;
};

export const refreshConnectionState = connection => async dispatch => {
  await axios.post(
    `/pxgrid/connections/${connection}/refresh`,
    {},
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    }
  );

  await dispatch(fetchConnections());
};

export const disconnectWS = connection => async dispatch => {
  await axios.post(
    `/pxgrid/connections/${connection}/disconnect-ws`,
    {},
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    }
  );

  await dispatch(fetchConnections());
};
