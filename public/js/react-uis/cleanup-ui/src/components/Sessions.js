import React from "react";
import { Switch, Route, Link, useLocation, matchPath } from "react-router-dom";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";

import { Alert, Spinner as Loader, toast } from "react-cui-2.0";
import { ErrorDetails } from "my-utils";

import { pathPrefix } from "./tabData";
import { getHealth, cleanSessionsOlderThan } from "../actions";
import { HealthContext } from "../contexts";

const DAYS = [
  ["older_than_30", 30],
  ["older_than_ten", 10],
  ["older_than_five", 5],
];

const OlderThan = ({ days, list, proto }) => {
  const { triggerHealthUpdate } = React.useContext(HealthContext);
  const [blocked, setBlocked] = React.useState(false);

  const onClick = React.useCallback(async () => {
    try {
      setBlocked(true);
      await cleanSessionsOlderThan({ proto, days });
      triggerHealthUpdate("sessions");
    } catch (e) {
      toast.error("Operation failed", e.message);
      setBlocked(false);
    }
  }, [proto, days]);

  return (
    <div className="col animated fadeIn">
      <h3>
        {"Older than "}
        {days}
        {" days:"}
      </h3>
      <ul className="list list--compressed dbl-margin-bottom">
        {list.map((l, idx) => (
          <li key={idx}>{`${l.owner}: ${l.count}`}</li>
        ))}
      </ul>
      <a
        className={`btn btn--success${blocked ? " disabled" : ""}`}
        onClick={onClick}
      >
        <span>
          Clean Up &gt;&nbsp;
          {days}
          {" days!"}
          {blocked ? (
            <span className="qtr-margin-left icon-animation spin" />
          ) : null}
        </span>
      </a>
    </div>
  );
};

const ProtoDisplay = ({ list, proto }) => {
  if (
    !list ||
    !Object.keys(list).reduce(
      (prev, k) => prev || Boolean(list[k].length),
      false
    )
  )
    return "No outdated sessions";

  return (
    <div className="base-margin-bottom row">
      {DAYS.map(([k, d]) =>
        list[k].length ? (
          <OlderThan
            key={`${proto}-${d}`}
            days={d}
            list={list[k]}
            proto={proto}
          />
        ) : null
      )}
    </div>
  );
};

const DisplaySessions = ({ result }) => {
  const location = useLocation();
  const shownProto = React.useMemo(() => {
    const match = matchPath(location.pathname, {
      path: `${pathPrefix}/sessions/:proto?`,
    });
    return match && match.params.proto ? match.params.proto : "radius";
  }, [location.pathname]);

  if (
    (!result.radius ||
      !Object.keys(result.radius).reduce(
        (prev, k) => prev || Boolean(result.radius[k].length),
        false
      )) &&
    (!result.tacacs ||
      !Object.keys(result.tacacs).reduce(
        (prev, k) => prev || Boolean(result.tacacs[k].length),
        false
      ))
  )
    return (
      <h2 className="display-3 no-margin-top text-capitalize flex-fluid">
        No outdated sessions
      </h2>
    );

  return (
    <div className="animated fadeIn">
      <h2 className="display-3 no-margin-top text-capitalize flex-fluid">
        Outdated sessions
      </h2>
      Protocol:
      <ul className="list list--inline divider--vertical half-margin-bottom">
        {["radius", "tacacs"].map((p) => (
          <li key={p}>
            {shownProto === p ? (
              <span>{p.toUpperCase()}</span>
            ) : (
              <Link to={`${pathPrefix}/sessions/${p}/`}>{p.toUpperCase()}</Link>
            )}
          </li>
        ))}
      </ul>
      <div className="section">
        <Switch>
          <Route path={`${pathPrefix}/sessions/tacacs`}>
            <ProtoDisplay list={result[shownProto]} proto="tacacs" />
          </Route>
          <Route path={`${pathPrefix}/sessions/`}>
            <ProtoDisplay list={result[shownProto]} proto="radius" />
          </Route>
        </Switch>
      </div>
    </div>
  );
};

export const Sessions = () => {
  const {
    updateTrigger: { sessions: trigger },
  } = React.useContext(HealthContext);
  const loadState = useAsync({
    promiseFn: getHealth,
    what: "sessions",
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
        {({ result }) => <DisplaySessions result={result} />}
      </IfFulfilled>
    </div>
  );
};
