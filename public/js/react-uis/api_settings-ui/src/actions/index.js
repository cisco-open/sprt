import axios from "axios";

export const loadApiSettings = async () => {
  const res = await axios.get(globals.rest.preferences.api, {
    headers: { Accept: "application/json" }
  });

  return res.data;
};

export const saveApiSettings = async data => {
  const res = await axios.put(globals.rest.preferences.api, data, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    }
  });

  return res.data;
};
