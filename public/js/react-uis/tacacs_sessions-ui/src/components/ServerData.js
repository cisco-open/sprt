import React from "react";

import history from "../history";
import { BulkContext } from "../contexts";

import { srvRegex } from "./utils";
import BulksList from "./BulksList";
import SessionList from "./SessionList";

const bulksReducer = (state, action) => {
  switch (action.type) {
    case "SET_SESSIONS": {
      const i = state.findIndex((b) => action.payload.name === b.name);
      if (i >= 0) {
        state[i].sessions = action.payload.sessions;
        return [...state];
      }
      return state;
    }
    default:
      return state;
  }
};

export default ({ server: { server, bulks: receivedBulks }, reloadBulks }) => {
  const [bulk, setBulk] = React.useState({});
  const [bulks, dispatchBulksAction] = React.useReducer(
    bulksReducer,
    receivedBulks || []
  );

  React.useEffect(() => {
    const [, , name] = history.location.pathname.match(srvRegex);
    if (name) setBulk({ name, flag: true });
  }, []);

  const selectBulk = (newBulk) => {
    history.push(
      `${globals.rest.tacacs_sessions}${server}/bulk/${newBulk.name}/`
    );
    setBulk((old) => ({ ...newBulk, flag: !old.flag }));
  };

  return (
    <BulkContext.Provider
      value={{
        ...bulk,
        server,
        reloadBulks,
        setBulkSessions: (value) =>
          dispatchBulksAction({
            type: "SET_SESSIONS",
            payload: { name: bulk.name, sessions: value },
          }),
      }}
    >
      <div className="row">
        <div className="col-md-4 col-lg-3 col-xl-2 fixed-left-lg-up">
          <BulksList
            {...{
              bulks,
              selectBulk,
            }}
          />
        </div>
        <div className="col-md-8 col-lg-9 col-xl-10 offset-xl-2 offset-lg-3">
          <SessionList />
        </div>
      </div>
    </BulkContext.Provider>
  );
};
