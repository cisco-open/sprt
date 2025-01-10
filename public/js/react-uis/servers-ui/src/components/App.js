import React from "react";
import ReactModal from "react-modal";

import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";

import Portal from "portal";

import { Spinner as Loader, Alert, ToastContainer } from "react-cui-2.0";

import history from "../history";
import { ServerContext } from "../contexts";
import { loadServers } from "../actions";

import { ServerTab } from "./ServerTab";
import { ServerTabContent } from "./ServerTabContent";

const tabRegex = new RegExp(
  `${globals.rest.servers.server}([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}|new)/`
);

const ServersList = ({ servers, server, updServer }) => (
  <div className="position-sticky base-sticky-top">
    <div className="subheader base-margin-left hidden-sm-down">Servers</div>
    <ul className="tabs tabs--vertical">
      {servers.map((s) => (
        <ServerTab
          server={s}
          onClick={() => updServer(s.id)}
          key={s.id}
          active={server}
        />
      ))}
      <li className={`tab${server === "new" ? " active" : ""}`}>
        <a className="add-link flex" onClick={() => updServer("new")}>
          <div className="flex-fluid text-left">Add server</div>
          <span
            className="icon-add-outline half-margin-left half-margin-right"
            aria-hidden="true"
            title="Add"
          />
        </a>
      </li>
    </ul>
  </div>
);

export default () => {
  const [server, setServer] = React.useState(null);

  React.useEffect(() => {
    ReactModal.setAppElement("body");
    if (tabRegex.test(history.location.pathname)) {
      const [, id] = history.location.pathname.match(tabRegex);
      setServer(id);
    }
  }, []);

  const updServer = (id) => {
    if (id) {
      setServer(id);
      history.push(`${globals.rest.servers.server}${id}/`);
    } else {
      setServer(null);
      history.push(globals.rest.servers.base);
    }
  };
  const loadingState = useAsync({ promiseFn: loadServers });

  return (
    <>
      <IfPending state={loadingState}>
        <Loader />
      </IfPending>
      <IfRejected state={loadingState}>
        {(error) => (
          <Alert type="error" title="Operation failed">
            {"Couldn't get servers list: "}
            {error.message}
          </Alert>
        )}
      </IfRejected>
      <IfFulfilled state={loadingState}>
        {({ servers }) => (
          <div className="row">
            <div
              className="col-md-4 col-lg-3 col-xl-2 fixed-left-lg-up"
              style={{ position: "relative" }}
            >
              <ServersList {...{ server, servers: servers || [], updServer }} />
            </div>
            <div className="col-md-8 col-lg-9 col-xl-10 offset-xl-2 offset-lg-3">
              <div className="tab-content">
                <ServerContext.Provider
                  value={{
                    reload: loadingState.reload,
                    updServer,
                    ...(server
                      ? server === "new"
                        ? { id: "new" }
                        : servers.find((s) => s.id === server)
                      : {}),
                  }}
                >
                  <ServerTabContent />
                </ServerContext.Provider>
              </div>
            </div>
          </div>
        )}
      </IfFulfilled>
      <Portal id="toast-portal">
        <ToastContainer />
      </Portal>
    </>
  );
};
