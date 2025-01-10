import React from "react";
import { DateTime, Settings } from "luxon";

import { Fade } from "animations";
import { toast } from "react-cui-2.0";

import { removeCron } from "../actions";
import { ActionsContext } from "../contexts";

const DeleteButton = ({ line, command }) => {
  const [blocked, setBlocked] = React.useState(false);
  const { removeCron: removeCronReducer, user } = React.useContext(
    ActionsContext
  );

  const onClick = React.useCallback(async () => {
    try {
      setBlocked(true);
      await removeCron({ line, command, user });
      removeCronReducer(undefined, line);
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
    console.log(t);
  } catch (e) {
    // Silently
  }
  Settings.throwOnInvalid = old;
  return t;
};

const Cron = ({ cron, job }) => (
  <li>
    <div className="panel panel--bordered flex flex-center-vertical">
      <ul className="list list--inline divider--vertical flex-fill">
        <li>
          <span className="text-bold">Job:</span> {job.name}
        </li>
        <li>
          <span className="text-bold">When:</span> {cron.human}
        </li>
        <li>
          <span className="text-bold">Next:</span> {makeNext(cron.next)}
        </li>
        {cron.args.updates ? (
          <li>
            <span className="text-bold">Updates</span>
          </li>
        ) : null}
      </ul>
      <DeleteButton line={cron.line} command={cron.command} />
    </div>
  </li>
);

export const Scheduled = ({ schedules, jobs }) => {
  const filteredJobs = React.useMemo(
    () =>
      schedules.reduce((arr, cur) => {
        arr.push(
          jobs.find((j) => j.id.toLowerCase() === cur.args.jid.toLowerCase())
        );
        return arr;
      }, []),
    [schedules]
  );

  return (
    <Fade in={Boolean(schedules.length)} enter exit unmountOnExit mountOnEnter>
      <div className="base-margin-bottom">
        <h2 className="display-3 no-margin-top text-capitalize flex-fluid">
          Scheduled jobs
        </h2>
        <div className="base-margin-bottom">
          <ul className="list list--highlight">
            {schedules.map((s, idx) => (
              <Cron
                key={s.line || s.id || idx}
                cron={s}
                job={filteredJobs[idx]}
              />
            ))}
          </ul>
        </div>
      </div>
    </Fade>
  );
};
