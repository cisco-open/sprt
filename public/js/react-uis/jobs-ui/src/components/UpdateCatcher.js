import React from "react";

import { getUpdate } from "../actions";
import { ActionsContext } from "../contexts";

export const UpdatesCatcher = ({ user, jobs, watchedJobs }) => {
  const [generalTimer, setGeneralTimer] = React.useState(0);
  const [noChanges, setNoChanges] = React.useState({ v: 0, flag: 0 });
  const { reloadJobs, jobRemoved, reloadSomeJobs } = React.useContext(
    ActionsContext
  );

  const updateTimer = () => {
    setGeneralTimer(prev => {
      clearTimeout(prev);
      return setTimeout(
        async () => {
          try {
            const r = await getUpdate(jobs, watchedJobs, user);
            if (r.missing.length) {
              reloadJobs();
            } else if (r.removed.length) {
              jobRemoved(r.removed);
            } else if (r.updated.length) {
              reloadSomeJobs({
                _from: "defer",
                status: "ok",
                jobs: r.updated,
                running: r.running
              });
            } else
              setNoChanges(prev => ({ v: prev.v + 1, flag: prev.flag + 1 }));
          } catch (e) {
            console.error("Stopping update checker", e);
          }
        },
        noChanges.v < 3 ? 1000 : 5000
      );
    });
  };

  React.useEffect(() => {
    setNoChanges(prev => ({ v: 0, flag: prev.flag + 1 }));
  }, [watchedJobs, jobs, user]);

  React.useEffect(() => {
    if (generalTimer) clearTimeout(generalTimer);
    updateTimer();
  }, [noChanges.flag]);

  React.useEffect(() => {
    return () => clearTimeout(generalTimer);
  }, []);

  return <></>;
};
