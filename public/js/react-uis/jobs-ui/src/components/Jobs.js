import React from "react";

import { Dropdown } from "react-cui-2.0";
import { FadeCollapse } from "animations";

import { arrangeReducer, ARRANGE } from "../reducers";
import { ActionsContext } from "../contexts";

import { JobCard } from "./JobCard";

const arranges = [
  [ARRANGE.NONE, "None"],
  [ARRANGE.DATE, "Date"],
  [ARRANGE.PROTOCOL, "Protocol"],
  [ARRANGE.SERVER, "Server"],
];

export const Jobs = ({ jobs, type, arrangeable }) => {
  const [arrange, setArrange] = React.useState(() =>
    arrangeable ? "none" : null
  );
  const [arrangedIds, dispatchArrange] = React.useReducer(arrangeReducer, null);
  const { removeJobs, stopJobs } = React.useContext(ActionsContext);

  const updateArrange = (arr) => {
    dispatchArrange({ type: arr, payload: { jobs } });
    setArrange(arr);
  };

  React.useEffect(() => updateArrange(arrange), [jobs]);

  return (
    <FadeCollapse
      in={Boolean(jobs.length)}
      enter
      exit
      unmountOnExit
      mountOnEnter
    >
      <div className="base-margin-bottom">
        <h2 className="display-3 no-margin-top text-capitalize flex-fluid">
          {type}
          {" jobs"}
        </h2>
        <div className="base-margin-bottom">
          <ul className="list list--inline divider--vertical">
            {arrangeable ? (
              <li key="arrange">
                {"Arrange by: "}
                <Dropdown
                  type="link"
                  alwaysClose
                  divClassName="half-margin-left half-margin-right"
                  header={arranges.reduce(
                    (acc, curr) => (curr[0] === arrange ? curr[1] : acc),
                    ""
                  )}
                >
                  {arranges.map((a) => (
                    <a
                      key={a[0]}
                      onClick={() => updateArrange(a[0])}
                      className={a[0] === arrange ? "selected" : ""}
                    >
                      {a[1]}
                    </a>
                  ))}
                </Dropdown>
              </li>
            ) : null}
            {type === "finished" ? (
              <li key="remove">
                <Dropdown
                  type="link"
                  alwaysClose
                  header="Remove jobs"
                  divClassName={arrangeable ? "half-margin-left" : ""}
                >
                  <a
                    onClick={() =>
                      removeJobs(jobs.filter((j) => j.success).map((j) => j.id))
                    }
                  >
                    {"All successfully "}
                    {type}
                    {" jobs"}
                  </a>
                  <a
                    onClick={() =>
                      removeJobs(jobs.filter((j) => j.fail).map((j) => j.id))
                    }
                  >
                    All failed jobs
                  </a>
                </Dropdown>
              </li>
            ) : (
              <>
                <li key="stop-jobs">
                  <a onClick={() => stopJobs(jobs.map((j) => j.id))}>
                    Stop jobs
                  </a>
                </li>
                <li key="stop-and-remove">
                  <a onClick={() => removeJobs(jobs.map((j) => j.id))}>
                    Stop and remove jobs
                  </a>
                </li>
              </>
            )}
          </ul>
        </div>
        {arrangedIds ? (
          arrangedIds.map((a) => (
            <div className="arranged animated fadeIn" key={a.cat}>
              <h3 className="4 base-margin-top no-margin-bottom">{a.cat}</h3>
              <ul className="list list--inline divider--vertical">
                <li key="remove-jobs">
                  <a
                    onClick={() =>
                      removeJobs(a.jobs.map((jid) => jobs[jid].id))
                    }
                  >
                    Remove jobs
                  </a>
                </li>
              </ul>
              <div className="grid half-margin-top half-margin-bottom">
                {a.jobs.map((jid) => (
                  <JobCard key={jid} job={jobs[jid]} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="grid">
            {jobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        )}
      </div>
    </FadeCollapse>
  );
};

export const NoJobs = () => <div>No jobs found.</div>;
