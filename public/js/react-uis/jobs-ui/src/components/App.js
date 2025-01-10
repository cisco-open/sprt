import React from "react";
import ReactModal from "react-modal";

import { useAsync } from "react-async";

import Portal from "portal";

import { Spinner as Loader, Alert, ToastContainer, toast } from "react-cui-2.0";

import { ErrorDetails } from "my-utils";

import history from "../history";
import { getJobs, removeJobs, repeatJobs, stopJobs } from "../actions";
import { ActionsContext } from "../contexts";
import {
  BLOCK_MULTI,
  BLOCK_ONE,
  UNBLOCK_MULTI,
  UNBLOCK_ONE,
  blockedJobsReducer,
  WATCH,
  watchedJobsReducer,
  JOBS,
  jobsReducer,
  CRONS,
  cronsReducer,
} from "../reducers";

import { userRegex } from "./utils";
import { PickUser } from "./PickUser";
import { NoJobs, Jobs } from "./Jobs";
import { UpdatesCatcher } from "./UpdateCatcher";
import { Scheduled } from "./Scheduled";

const JobsWrapper = () => {
  const [user, setUser] = React.useState(() => {
    const [, usr] = history.location.pathname.match(userRegex);
    return { name: usr || "", reload: true, can_switch: false };
  });

  const [jobs, dispatchJobs] = React.useReducer(jobsReducer, []);
  const [crons, dispatchCrons] = React.useReducer(cronsReducer, []);

  const [blockedJobs, dispatchBlocked] = React.useReducer(
    blockedJobsReducer,
    {}
  );

  const [watchedJobs, dispatchWatched] = React.useReducer(
    watchedJobsReducer,
    []
  );

  const updateJobs = (data) => {
    if (data._from === "promise") {
      setUser((prev) => ({
        name: data.user,
        reload: prev.reload,
        can_switch: data.can_switch,
      }));
      dispatchJobs({ type: JOBS.NEW_FROM_DATA, payload: data });
      dispatchCrons({ type: CRONS.NEW_FROM_DATA, payload: data });
    } else if (data.status === "ok") {
      dispatchJobs({ type: JOBS.UPD, payload: data });
    } else {
      dispatchWatched({ type: WATCH.CLR });
    }
  };

  const jobsActionHandler = async (jobsIds, fn, endStatus) => {
    if (!Array.isArray(jobsIds) || !jobsIds.length) return;

    dispatchBlocked({ type: BLOCK_MULTI, payload: { jobs: jobsIds } });

    try {
      const r = await fn(jobsIds, user.name);
      switch (r.status) {
        case "ok":
          dispatchBlocked({
            type: BLOCK_MULTI,
            payload: { jobs: jobsIds, status: endStatus },
          });
          break;
        case "multi":
          dispatchBlocked({
            type: BLOCK_MULTI,
            payload: { jobs: r.ok, status: endStatus },
          });
          dispatchBlocked({ type: UNBLOCK_MULTI, payload: { jobs: r.notok } });
          break;
        default:
          dispatchBlocked({ type: UNBLOCK_MULTI, payload: { jobs: jobsIds } });
          break;
      }

      if (Array.isArray(r.messages) && r.messages.length)
        r.messages.forEach((m) => toast(m.type, undefined, m.message));
    } catch (e) {
      dispatchBlocked({ type: UNBLOCK_MULTI, payload: { jobs: jobsIds } });
      toast.error("Error", e.message);
    }
  };

  const loadingState = useAsync({
    promiseFn: getJobs,
    watch: user.reload,
    user: user.name,
    onResolve: updateJobs,
  });

  const reloadJobs = () => {
    setUser((prev) => ({ ...prev, reload: !prev.reload }));
  };

  const selectUser = (name) => {
    if (name) history.push(`${globals.rest.jobs.base}user/${name}/`);
    else history.push(globals.rest.jobs.base);
    setUser((old) => ({
      name,
      reload: !old.reload,
      can_switch: old.can_switch,
    }));
    dispatchWatched({ type: WATCH.CLR });
  };

  if (!jobs.length) {
    if (loadingState.isPending) return <Loader />;
    if (loadingState.error)
      return (
        <Alert type="error" title="Operation failed">
          {"Couldn't get jobs data: "}
          {loadingState.error.message}
          <ErrorDetails error={loadingState.error} />
        </Alert>
      );
    if (loadingState.data)
      return (
        <>
          {user.can_switch ? (
            <PickUser user={user.name} selectUser={selectUser} />
          ) : null}
          <NoJobs />
        </>
      );
    return <NoJobs />;
  }

  if (loadingState.error) toast.error("Error", loadingState.error.message);

  return (
    <>
      {user.can_switch ? (
        <PickUser user={user.name} selectUser={selectUser} />
      ) : null}
      <ActionsContext.Provider
        value={{
          user: user.name,
          blockedJobs,
          reloadJobs,
          reloadSomeJobs: (data) => updateJobs(data),
          removeJobs: (jobsIds) =>
            jobsActionHandler(jobsIds, removeJobs, "deleted"),
          repeatJobs: (jobsIds) =>
            jobsActionHandler(jobsIds, repeatJobs, "repeated"),
          stopJobs: (jobsIds) =>
            jobsActionHandler(jobsIds, stopJobs, "stopped"),
          jobRemoved: (ids) => {
            dispatchJobs({ type: JOBS.DEL, payload: ids });
            dispatchCrons({ type: CRONS.JOBS_DELETED, payload: ids });
          },
          unblockJob: (job) =>
            dispatchBlocked({ type: UNBLOCK_ONE, payload: { job } }),
          blockJob: (job, status = "loading") =>
            dispatchBlocked({ type: BLOCK_ONE, payload: { job, status } }),
          watchJob: (id) => dispatchWatched({ type: WATCH.ADD, payload: id }),
          unwatchJob: (id) => dispatchWatched({ type: WATCH.DEL, payload: id }),
          removeCron: (idx, line) =>
            dispatchCrons({ type: CRONS.DEL, payload: { idx, line } }),
        }}
      >
        {jobs && jobs.length ? (
          <>
            <Scheduled schedules={crons} jobs={jobs} />
            <Jobs jobs={jobs.filter((j) => j.running)} type="running" />
            <Jobs
              jobs={jobs.filter((j) => !j.running)}
              type="finished"
              arrangeable
            />
          </>
        ) : (
          <NoJobs />
        )}
        <UpdatesCatcher
          jobs={jobs.reduce((ids, j) => {
            ids.push(j.id);
            return ids;
          }, [])}
          user={user.name}
          watchedJobs={watchedJobs}
        />
      </ActionsContext.Provider>
    </>
  );
};

export default () => {
  React.useEffect(() => {
    ReactModal.setAppElement("body");
  }, []);

  return (
    <>
      <JobsWrapper />
      <Portal id="toast-portal">
        <ToastContainer />
      </Portal>
    </>
  );
};
