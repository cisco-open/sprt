import React from "react";
import ReactModal from "react-modal";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import Portal from "portal";
import { DynamicModal, ToastContainer } from "react-cui-2.0";

import { UserContext } from "../contexts";
import { loadApiSettings } from "../../../api_settings-ui/src/actions";

import ServerList from "./ServerList";
import ServerData from "./ServerData";

export default () => {
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
    ReactModal.setAppElement("body");

    checkApi();
  }, []);

  return (
    <UserContext.Provider value={apiSettings}>
      <Router basename="/manipulate">
        <Switch>
          <Route path="/server/:proto(radius|tacacs)?/:server/" strict>
            <ServerData />
          </Route>
          <Route>
            <ServerList />
          </Route>
        </Switch>
      </Router>
      <DynamicModal />
      <Portal id="toast-portal">
        <ToastContainer />
      </Portal>
    </UserContext.Provider>
  );
};
