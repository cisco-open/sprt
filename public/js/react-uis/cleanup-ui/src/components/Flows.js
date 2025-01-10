import React from "react";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";

import { Alert, Spinner as Loader, toast } from "react-cui-2.0";
import { ErrorDetails } from "my-utils";

import { getHealth, cleanOrphanFlows } from "../actions";
import { HealthContext } from "../contexts";

const DisplayFlows = ({ result }) => {
  const [blocked, setBlocked] = React.useState(false);
  const { triggerHealthUpdate } = React.useContext(HealthContext);

  const onClick = React.useCallback(async () => {
    try {
      setBlocked(true);
      await cleanOrphanFlows();
      triggerHealthUpdate("flows");
    } catch (e) {
      toast.error("Operation failed", e.message);
      setBlocked(false);
    }
  }, [result]);

  if (!Array.isArray(result) || !result.length)
    return (
      <h2 className="display-3 no-margin-top text-capitalize flex-fluid">
        No orphaned flows
      </h2>
    );

  return (
    <div className="animated fadeIn">
      <h2 className="display-3 no-margin-top text-capitalize flex-fluid">
        Orphaned flows
      </h2>
      <div className="section">
        {"Found "}
        <strong>{result.length}</strong>
        {" orphaned flow"}
        {result.length > 1 ? "s" : ""}
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

export const Flows = () => {
  const {
    updateTrigger: { flows: trigger },
  } = React.useContext(HealthContext);
  const loadState = useAsync({
    promiseFn: getHealth,
    what: "flows",
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
        {({ result }) => <DisplayFlows result={result} />}
      </IfFulfilled>
    </div>
  );
};
