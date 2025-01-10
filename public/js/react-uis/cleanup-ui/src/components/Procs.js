import React from "react";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";

import {
  Alert,
  Spinner as Loader,
  toast,
  Accordion,
  AccordionElement,
} from "react-cui-2.0";
import { ErrorDetails } from "my-utils";

import { getHealth, killPid } from "../actions";
import { HealthContext } from "../contexts";

const KillButton = ({ pid }) => {
  const [blocked, setBlocked] = React.useState(false);
  const { triggerHealthUpdate } = React.useContext(HealthContext);

  const onClick = React.useCallback(async () => {
    try {
      setBlocked(true);
      await killPid(pid);
      triggerHealthUpdate("procs");
    } catch (e) {
      toast.error("Operation failed", e.message);
      setBlocked(false);
    }
  }, [pid]);

  return (
    <a
      className={`qtr-margin-left${blocked ? " disabled" : ""}`}
      onClick={onClick}
    >
      <span
        className={blocked ? "icon-animation spin" : "icon-close"}
        title="Stop the process"
      />
    </a>
  );
};

const ProcessTree = ({ list }) => (
  <ul className="list qtr-margin-left">
    {list.map((l) => (
      <li key={l.pid}>
        <div className="flex">
          <div className="flex-fill">
            <span className="text-muted qtr-margin-right">\_</span>
            {l.cmndline}
          </div>
          <div>
            {`MEM: ${l.pctmem}% | CPU: ${l.pctcpu}%`}
            <KillButton pid={l.pid} />
          </div>
        </div>
        {l.children.length ? <ProcessTree list={l.children} /> : null}
      </li>
    ))}
  </ul>
);

const UserProcess = ({ proc }) => {
  return (
    <Accordion toggles>
      <AccordionElement
        className="text-monospace"
        defaultOpen={false}
        title={`${proc.pid} - ${proc.cmndline}`}
      >
        <div className="flex">
          <div className="flex-fill">{proc.cmndline}</div>
          <div>
            {`MEM: ${proc.pctmem}% | CPU: ${proc.pctcpu}%`}
            <KillButton pid={proc.pid} />
          </div>
        </div>
        {proc.children.length ? <ProcessTree list={proc.children} /> : null}
        <div className="half-margin-bottom" />
      </AccordionElement>
    </Accordion>
  );
};

const DisplayProcs = ({ result }) => {
  if (!result || !result.total)
    return (
      <h2 className="display-3 no-margin-top text-capitalize flex-fluid">
        No running processes
      </h2>
    );

  return (
    <div className="animated fadeIn">
      <h2 className="display-3 no-margin-top text-capitalize flex-fluid">
        Running processes
      </h2>
      <div className="section no-padding-top">
        {Object.keys(result.peruser)
          .sort()
          .map((user) => (
            <div className="animated fadeIn" key={user}>
              <h3 className="display-4 base-margin-top">{user}</h3>
              <div className="panel no-padding">
                {result.peruser[user].map((proc) => (
                  <UserProcess proc={proc} key={`${user}-${proc.pid}`} />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export const Procs = () => {
  const {
    updateTrigger: { procs: trigger },
  } = React.useContext(HealthContext);
  const loadState = useAsync({
    promiseFn: getHealth,
    what: "procs",
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
        {({ result }) => <DisplayProcs result={result} />}
      </IfFulfilled>
    </div>
  );
};
