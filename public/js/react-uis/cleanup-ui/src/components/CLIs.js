import React from "react";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";

import { Alert, Spinner as Loader, toast } from "react-cui-2.0";
import { ErrorDetails } from "my-utils";

import { getHealth, cleanOrphanCLIs } from "../actions";
import { HealthContext } from "../contexts";

const DisplayCLIs = ({ result }) => {
  const [blocked, setBlocked] = React.useState(false);
  const { triggerHealthUpdate } = React.useContext(HealthContext);

  const onClick = React.useCallback(async () => {
    try {
      setBlocked(true);
      await cleanOrphanCLIs();
      triggerHealthUpdate("clis");
    } catch (e) {
      toast.error("Operation failed", e.message);
      setBlocked(false);
    }
  }, [result]);

  if (!Array.isArray(result) || !result.length)
    return (
      <h2 className="display-3 no-margin-top text-capitalize flex-fluid">
        No orphaned CLIs
      </h2>
    );

  return (
    <div className="animated fadeIn">
      <h2 className="display-3 no-margin-top text-capitalize flex-fluid">
        Orphaned CLIs
      </h2>
      <div className="section">
        {"Found "}
        <strong>{result.length}</strong>
        {" orphaned CLI"}
        {result.length > 1 ? "s" : ""}
        {" (no jobs assigned)"}
      </div>
      <a
        className={`btn btn--success${blocked ? " disabled" : ""}`}
        onClick={onClick}
      >
        <span>
          Clean Up!
          {blocked ? (
            <span className="qtr-margin-left icon-animation spin" />
          ) : null}
        </span>
      </a>
    </div>
  );
};

export const CLIs = () => {
  const {
    updateTrigger: { clis: trigger },
  } = React.useContext(HealthContext);
  const loadState = useAsync({
    promiseFn: getHealth,
    what: "clis",
    full: true,
    watch: trigger,
  });

  return (
    <div className="animated fadeIn section no-padding">
      <IfPending state={loadState}>
        <Loader />
      </IfPending>
      <IfRejected state={loadState}>
        {(error) => (
          <Alert type="error" title="Operation failed">
            {"Couldn't get data: "}
            {error.message}
            <ErrorDetails error={error} />
          </Alert>
        )}
      </IfRejected>
      <IfFulfilled state={loadState}>
        {({ result }) => <DisplayCLIs result={result} />}
      </IfFulfilled>
    </div>
  );
};
