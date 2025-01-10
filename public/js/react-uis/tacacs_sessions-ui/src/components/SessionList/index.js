import React from "react";
import { useAsync } from "react-async";

import { Spinner as Loader, Alert } from "react-cui-2.0";
import { ErrorDetails } from "my-utils";

import { BulkContext, SessionsContext } from "../../contexts";
import { getBulkSessions } from "../../actions";

import { ActionPanel } from "./ActionPanel";
import { SessionsTable } from "./SessionsTable";

const selectionReducer = (state, action) => {
  switch (action.type) {
    case "ADD":
      if (Array.isArray(action.payload)) {
        return [
          ...state,
          ...action.payload.filter((idx) => !state.includes(idx)),
        ];
      }
      return state.includes(action.payload)
        ? state
        : [...state, action.payload];
    case "DEL":
      if (Array.isArray(action.payload)) {
        action.payload
          .filter((idx) => state.includes(idx))
          .forEach((idx) => state.splice(state.indexOf(idx), 1));
        return [...state];
      }
      if (state.includes(action.payload)) {
        state.splice(state.indexOf(action.payload), 1);
        return [...state];
      }
      return state;

    case "CLEAR":
      return [];
    default:
      return state;
  }
};

const LoadOverlay = ({ what, active }) => {
  if (!active) return null;

  if (!what.current) return <Loader />;

  return (
    <div
      className="load-overlay flex flex-center"
      style={{
        width: what.current.offsetWidth,
        height: what.current.offsetHeight,
        top: what.current.offsetTop,
        left: what.current.offsetLeft,
      }}
    >
      <Loader />
    </div>
  );
};

export default () => {
  const [paging, setPaging] = React.useState({});
  const [sessions, setSessions] = React.useState([]);
  const [selected, selectionDispatch] = React.useReducer(selectionReducer, []);
  const { server, ...bulk } = React.useContext(BulkContext);
  const tableRef = React.useRef(null);

  const sessionsLoadState = useAsync({
    deferFn: getBulkSessions,
    defer: true,
    server,
    bulk: bulk.name,
    onResolve: (data) => {
      setSessions(data.sessions);
      if (data.paging) setPaging(data.paging);
      if (data.paging && !data.paging.filter && data.paging.total)
        bulk.setBulkSessions(data.paging.total);
    },
  });

  const updPaging = (how, merge = true) => {
    sessionsLoadState.run(merge ? { ...paging, ...how } : how);
  };

  React.useEffect(() => {
    sessionsLoadState.run();
  }, [bulk.flag]);

  if (!Array.isArray(sessions))
    return sessionsLoadState.isPending ? <Loader /> : null;

  return (
    <div className="tab-pane active">
      <h2 className="display-3 no-margin half-margin-bottom text-capitalize flex-fluid">
        Sessions
      </h2>
      {sessionsLoadState.error ? (
        <Alert type="error" title="Operation failed">
          {"Couldn't get server data: "}
          {sessionsLoadState.error.message}
          <ErrorDetails error={sessionsLoadState.error} />
        </Alert>
      ) : (
        <SessionsContext.Provider
          value={{
            sessions,
            paging,
            updPaging,
            selection: {
              selected,
              select: (idx) => selectionDispatch({ type: "ADD", payload: idx }),
              selectAll: () =>
                selectionDispatch({
                  type: "ADD",
                  payload: sessions.map((s) => s.id),
                }),
              deselect: (idx) =>
                selectionDispatch({ type: "DEL", payload: idx }),
              deselectAll: () =>
                selectionDispatch({
                  type: "DEL",
                  payload: sessions.map((s) => s.id),
                }),
              clear: () => selectionDispatch({ type: "CLEAR" }),
            },
            reload: () => sessionsLoadState.run(),
          }}
        >
          <ActionPanel loading={sessionsLoadState.isPending} />
          <SessionsTable
            loading={sessionsLoadState.isPending}
            tableRef={tableRef}
          />
          <LoadOverlay what={tableRef} active={sessionsLoadState.isPending} />
        </SessionsContext.Provider>
      )}
    </div>
  );
};
