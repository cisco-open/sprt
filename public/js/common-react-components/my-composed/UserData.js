import React from "react";
import axios from "axios";

export const loadApiSettings = async () => {
  const res = await axios.get(globals.rest.preferences.api, {
    headers: { Accept: "application/json" },
  });

  return res.data;
};

export const UserContext = React.createContext();

export const UserData = ({ children }) => {
  const [apiSettings, setApiSettings] = React.useState({ api: false });

  const checkApi = async () => {
    const { preferences } = await loadApiSettings();
    setApiSettings(
      preferences && preferences.token
        ? { api: true, token: preferences.token }
        : { api: false }
    );
  };

  React.useEffect(() => {
    checkApi();
  }, []);

  return (
    <UserContext.Provider value={apiSettings}>{children}</UserContext.Provider>
  );
};
