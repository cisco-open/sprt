import React from "react";
import { useParams, useHistory } from "react-router-dom";
import loadable from "@loadable/component";
import { useAsync } from "react-async";

import { toast, Spinner as Loader } from "react-cui-2.0";
// import { ErrorDetails } from "my-utils";

import { eventManager } from "my-utils/eventManager";

import { BulksContext, SessionsContext } from "../../../contexts";
import { getBulkSessions } from "../../../actions";
import {
  selectionReducer,
  SELECTION_ACTIONS,
  blockReducer,
  BLOCK_ACTIONS,
} from "../../../reducers";

export const bulkRefreshEvent = "bulk.refresh";

const List = loadable(() => import("./List"), {
  fallback: (
    <div className="flex-center">
      <Loader />
    </div>
  ),
});

export default () => {
  const { server, bulk } = useParams();
  const history = useHistory();
  const { setBulkState, setBulkAttribute } = React.useContext(BulksContext);
  const [sessions, setSessions] = React.useState([]);
  const [paging, setPaging] = React.useState({});
  const [selected, selectionDispatch] = React.useReducer(selectionReducer, []);
  const [blocked, blockDispatch] = React.useReducer(blockReducer, []);

  const promisedGetBulkSessions = React.useCallback(
    async (props) => {
      setBulkState(bulk, "loading", true);
      const r = await getBulkSessions([], props);
      setBulkState(bulk, null, true);
      return r;
    },
    [bulk]
  );

  const onResolve = React.useCallback(
    (data) => {
      setBulkState(bulk, null, false);
      if (data.error) {
        if (data.error === `Server ${server} not found`) {
          history.push(globals.rest.sessions);
          return true;
        }
        toast.error("Error", data.error, false);
        return true;
      }
      if (Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        selectionDispatch({ type: SELECTION_ACTIONS.CLEAR });
      }
      if (data.paging) setPaging(data.paging);
      if (data.paging && !data.paging.filter && data.paging.total)
        setBulkAttribute(bulk, "sessions", data.paging.total);
      return true;
    },
    [bulk, server]
  );

  const onReject = React.useCallback(() => {
    toast.error("Error", "Couldn't get bulks from server", false);
    setBulkState(bulk, null, false);
    setSessions([]);
    setPaging({});
  }, [bulk, server]);

  const loadingState = useAsync({
    promiseFn: promisedGetBulkSessions,
    deferFn: getBulkSessions,
    server,
    bulk,
    watchFn: ({ cServer, cBulk }, { pServer, pBulk }) =>
      cServer !== pServer || cBulk !== pBulk,
    onReject,
    onResolve,
  });

  const reloadBulk = React.useCallback(() => {
    setBulkState(bulk, "loading", true);
    loadingState.run({});
  }, [bulk, loadingState]);

  const updPaging = (how, merge = true) => {
    loadingState.run(merge ? { ...paging, ...how } : how);
  };

  React.useEffect(() => {
    // backendBlocked - blocked on backend
    const backendBlocked = sessions.reduce(
      (acc, s) => (s.attributes["job-chunk"] ? [...acc, s.id] : acc),
      []
    );

    if (blocked.length || backendBlocked.length) {
      const onlyGuiBlock = blocked.filter((i) => !backendBlocked.includes(i));
      const onlyBackendBlock = backendBlocked.filter(
        (i) => !blocked.includes(i)
      );
      // Unblock from GUI
      if (onlyGuiBlock.length)
        blockDispatch({ type: BLOCK_ACTIONS.DEL, payload: onlyGuiBlock });
      // block on GUI
      if (onlyBackendBlock.length)
        blockDispatch({ type: BLOCK_ACTIONS.ADD, payload: onlyBackendBlock });
    }
  }, [sessions]);

  React.useEffect(() => {
    eventManager.off(bulkRefreshEvent);
    eventManager.on(bulkRefreshEvent, reloadBulk);
  }, [reloadBulk]);

  return (
    <SessionsContext.Provider
      value={{
        sessions,
        removeSessions: (...ids) => {
          blockDispatch({ type: BLOCK_ACTIONS.DEL, payload: ids });
          setSessions((current) => current.filter((s) => !ids.includes(s.id)));
        },
        updateSessions: (newSessionsData) => {
          const ids = Object.keys(newSessionsData)
            .map((k) => parseInt(k, 10) || null)
            .filter((id) => id);
          setSessions((current) =>
            current.map((s) => (ids.includes(s.id) ? newSessionsData[s.id] : s))
          );
        },
        block: {
          blocked,
          blockSession: (...ids) =>
            blockDispatch({ type: BLOCK_ACTIONS.ADD, payload: ids }),
          blockAllSession: () =>
            blockDispatch({
              type: BLOCK_ACTIONS.ADD,
              payload: sessions.reduce((acc, s) => [...acc, s.id], []),
            }),
          unblockSession: (...ids) =>
            blockDispatch({ type: BLOCK_ACTIONS.DEL, payload: ids }),
          unblockAllSession: () => blockDispatch({ type: BLOCK_ACTIONS.CLEAR }),
        },
        paging,
        updPaging,
        selection: {
          selected,
          select: (idx) =>
            selectionDispatch({ type: SELECTION_ACTIONS.ADD, payload: idx }),
          selectAll: () =>
            selectionDispatch({
              type: SELECTION_ACTIONS.ADD,
              payload: sessions.map((s) => s.id),
            }),
          deselect: (idx) =>
            selectionDispatch({ type: SELECTION_ACTIONS.DEL, payload: idx }),
          deselectAll: () =>
            selectionDispatch({
              type: SELECTION_ACTIONS.DEL,
              payload: sessions.map((s) => s.id),
            }),
          clear: () => selectionDispatch({ type: SELECTION_ACTIONS.CLEAR }),
        },
        reload: reloadBulk,
      }}
    >
      <div className="tab-pane active">
        <h2 className="display-3 no-margin half-margin-bottom text-capitalize flex-fluid">
          Sessions
        </h2>
        <List
          loadingState={loadingState}
          bulkLoaded={() => setBulkState(bulk, null, false)}
        />
      </div>
    </SessionsContext.Provider>
  );
};
