import React from "react";
import {
  Switch,
  Route,
  useRouteMatch,
  useParams,
  useHistory,
} from "react-router-dom";

import { useAsync } from "react-async";
import { toast } from "react-cui-2.0";

import BulksList from "./BulksList";
import SessionList from "./SessionList";

import { getServerBulks } from "../../actions";
import { BulksContext } from "../../contexts";
import { bulksReducer, BULKS_ACTIONS } from "../../reducers";

export default () => {
  const [bulks, dispatchBulks] = React.useReducer(bulksReducer, []);
  const { path } = useRouteMatch();
  const { server } = useParams();
  const history = useHistory();

  const setBulks = (payload) =>
    dispatchBulks({ type: BULKS_ACTIONS.NEW, payload });

  const loadingState = useAsync({
    promiseFn: getServerBulks,
    server,
    watch: server,
    onReject: () => {
      toast.error("Error", "Couldn't get bulks from server", false);
    },
    onResolve: (data) => {
      try {
        const {
          server: {
            0: { bulks: newBulks },
          },
        } = data;
        setBulks(newBulks);
      } catch (e) {
        if (data.error) {
          if (data.error === `Server ${server} not found`) {
            history.push(globals.rest.sessions);
            return;
          }
          toast.error("Error", data.error, false);
        }
        setBulks([]);
      }
    },
  });

  return (
    <BulksContext.Provider
      value={{
        bulks,
        setBulks: (payload) =>
          dispatchBulks({ type: BULKS_ACTIONS.NEW, payload }),
        setBulkState: (name, state, dropOthers = true) =>
          dispatchBulks({
            type: BULKS_ACTIONS.BULK_STATE,
            payload: { name, state, dropOthers },
          }),
        setBulkAttribute: (bulk, attribute, value) =>
          dispatchBulks({
            type: BULKS_ACTIONS.BULK_ATTRIBUTE,
            payload: { bulk, attribute, value },
          }),
        reloadBulks: () => loadingState.reload(),
      }}
    >
      <div className="row">
        <div className="col-md-4 col-lg-3 col-xl-2 fixed-left-lg-up">
          <BulksList loadingState={loadingState} />
        </div>
        <div className="col-md-8 col-lg-9 col-xl-10 offset-xl-2 offset-lg-3">
          <Switch>
            <Route path={`${path}bulk/:bulk/`} strict>
              <SessionList />
            </Route>
            <Route>Select a bulk</Route>
          </Switch>
        </div>
      </div>
    </BulksContext.Provider>
  );
};
