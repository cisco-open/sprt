import React from "react";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";
import { DateTime, Settings } from "luxon";

import { Alert, Spinner as Loader, toast } from "react-cui-2.0";
import { ErrorDetails } from "my-utils";

import { getHealth, removeCron } from "../actions";
import { HealthContext } from "../contexts";

const DeleteButton = ({ line, command, user }) => {
  const [blocked, setBlocked] = React.useState(false);
  const { triggerHealthUpdate } = React.useContext(HealthContext);

  const onClick = React.useCallback(async () => {
    try {
      setBlocked(true);
      await removeCron(line, command, user);
      triggerHealthUpdate("schedules");
    } catch (e) {
      toast.error("Operation failed", e.message);
      setBlocked(false);
    }
  }, [line]);

  return (
    <a
      className={`qtr-margin-left${blocked ? " disabled" : ""}`}
      onClick={onClick}
    >
      <span
        className={blocked ? "icon-animation spin" : "icon-trash"}
        title="Delete entry"
      />
    </a>
  );
};

const makeNext = (t) => {
  const old = Settings.throwOnInvalid;
  Settings.throwOnInvalid = true;
  try {
    t = DateTime.fromISO(t).toLocaleString(DateTime.DATETIME_SHORT);
  } catch (e) {
    // Silently
  }
  Settings.throwOnInvalid = old;
  return t;
};

const UserCron = ({ cron, user }) => {
  return (
    <li>
      <div className="flex panel panel--bordered flex-center-vertical">
        <div className="flex-fill text-monospace">
          <div>{cron.line}</div>
          <div className="text-small qtr-margin-left">
            {`Next: ${makeNext(cron.next)}`}
          </div>
        </div>
        <DeleteButton line={cron.line} command={cron.command} user={user} />
      </div>
    </li>
  );
};

const DisplaySchedules = ({ result }) => {
  if (!result || !result.total)
    return (
      <h2 className="display-3 no-margin-top text-capitalize flex-fluid">
        No scheduled jobs
      </h2>
    );

  return (
    <div className="animated fadeIn">
      <h2 className="display-3 no-margin-top text-capitalize flex-fluid">
        Scheduled jobs
      </h2>
      <div className="section no-padding-top">
        {Object.keys(result.peruser)
          .sort()
          .map((user) => (
            <div className="animated fadeIn" key={user}>
              <h3 className="display-4 base-margin-top">{user}</h3>
              <div className="panel no-padding">
                <ul className="list list--highlight">
                  {result.peruser[user].map((cron, idx) => (
                    <UserCron cron={cron} key={idx} user={user} />
                  ))}
                </ul>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export const Schedules = () => {
  const {
    updateTrigger: { schedules: trigger },
  } = React.useContext(HealthContext);
  const loadState = useAsync({
    promiseFn: getHealth,
    what: "schedules",
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
        {({ result }) => <DisplaySchedules result={result} />}
      </IfFulfilled>
    </div>
  );
};
