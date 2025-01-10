import React from "react";
import ReactModal from "react-modal";

import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";

import Portal from "portal";

import { Spinner as Loader, Alert, ToastContainer } from "react-cui-2.0";
import { ErrorDetails } from "my-utils";

import history from "../history";
import { getLogsOwners } from "../actions";

import { logsRegex } from "./utils";
// import { Resizer } from "./Resizer";
// import OwnersList from "./OwnersList";
import OwnersList from "./VirtualizedList";
import OwnerData from "./OwnerData";

export default () => {
  const [owner, setOwner] = React.useState({ name: "", reload: true });

  React.useEffect(() => {
    ReactModal.setAppElement("body");

    const [, own] = history.location.pathname.match(logsRegex);
    setOwner((old) => ({ name: own, reload: !old.reload }));
  }, []);

  const loadingState = useAsync({
    promiseFn: getLogsOwners,
  });

  const selectOwner = (name) => {
    if (name) history.push(`${window.globals.rest.logs}owner/${name}/`);
    else history.push(window.globals.rest.logs);
    setOwner((old) => ({ name, reload: !old.reload }));
    if (!name) loadingState.reload();
  };

  return (
    <>
      <IfPending state={loadingState}>
        <Loader />
      </IfPending>
      <IfRejected state={loadingState}>
        {(error) => (
          <Alert type="error" title="Operation failed">
            {"Couldn't get logs data: "}
            {error.message}
            <ErrorDetails error={error} />
          </Alert>
        )}
      </IfRejected>
      <IfFulfilled state={loadingState}>
        {({ owners }) => (
          <div className="row">
            <div
              className="col-md-4 col-lg-3 col-xl-2 fixed-left-lg-up"
              style={{ bottom: 0, top: "66px" }}
            >
              <OwnersList
                owners={owners}
                owner={owner}
                selectOwner={selectOwner}
              />
            </div>
            <div className="col-md-8 col-lg-9 col-xl-10 offset-xl-2 offset-lg-3">
              {owner.name ? (
                <OwnerData owner={owner} reload={() => selectOwner("")} />
              ) : null}
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
