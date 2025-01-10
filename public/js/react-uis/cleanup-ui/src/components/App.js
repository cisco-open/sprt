import React from "react";
import ReactModal from "react-modal";
import { Router, Switch, Route } from "react-router-dom";

import Portal from "portal";
import { ToastContainer } from "react-cui-2.0";

import history from "../history";
import { HealthContext } from "../contexts";

import { tabData, pathPrefix } from "./tabData";
import { Tabs } from "./Tabs";

export default () => {
  React.useEffect(() => {
    ReactModal.setAppElement("body");
  }, []);

  const [updateTrigger, setUpdate] = React.useState(() =>
    tabData.reduce((o, t) => {
      o[t.path] = 0;
      return o;
    }, {})
  );

  return (
    <>
      <HealthContext.Provider
        value={{
          updateTrigger,
          triggerHealthUpdate: (what) =>
            setUpdate((prev) => ({ ...prev, [what]: prev[what] + 1 })),
        }}
      >
        <div className="row">
          <div className="col-md-4 col-lg-3 col-xl-2 fixed-left-lg-up">
            <div className="subheader base-margin-left hidden-sm-down">
              Clean Ups
            </div>
            <Router history={history}>
              <Route path={`${pathPrefix}/:tab?`}>
                <Tabs />
              </Route>
            </Router>
          </div>
          <div className="col-md-8 col-lg-9 col-xl-10 offset-xl-2 offset-lg-3">
            <Router history={history}>
              <Switch>
                {tabData.map((t) => (
                  <Route key={t.path} path={`${pathPrefix}/${t.path}`}>
                    {t.component}
                  </Route>
                ))}
              </Switch>
            </Router>
          </div>
        </div>
      </HealthContext.Provider>
      <Portal id="toast-portal">
        <ToastContainer />
      </Portal>
    </>
  );
};
