import React from "react";
import { useAsync } from "react-async";

import { loadSCEPServers } from "../../actions";
import { ServersContext } from "../../contexts";
import { arrayReducer } from "../../reducers";

import ActionPanel from "./ActionPanel";
import ServersTable from "./Table";

const actions = {
  new: "scep_servers/new",
  add: "scep_servers/add",
  del: "scep_servers/del",
  upd: "scep_servers/update",
};

const SCEPServers = () => {
  const [servers, dispatch] = React.useReducer(arrayReducer(actions), []);
  const [selected, setSelected] = React.useState([]);

  const selectServer = React.useCallback(
    (id) => setSelected((curr) => (curr.includes(id) ? curr : [...curr, id])),
    []
  );
  const deselectServer = React.useCallback(
    (id) =>
      setSelected((curr) =>
        curr.includes(id) ? curr.filter((checkId) => checkId !== id) : curr
      ),
    []
  );
  const clearSelection = React.useCallback(() => setSelected([]), []);
  const selectAll = React.useCallback(
    () =>
      setSelected(() => servers.reduce((all, curr) => [...all, curr.id], [])),
    [servers]
  );

  const newServers = React.useCallback(
    (payload) => dispatch({ type: actions.new, payload }),
    []
  );
  const addServers = React.useCallback((payload) => {
    dispatch({ type: actions.add, payload });
  }, []);
  const delServer = React.useCallback((id) => {
    dispatch({ type: actions.del, payload: id });
  }, []);
  const updateServer = React.useCallback((payload) => {
    dispatch({ type: actions.upd, payload });
  }, []);

  const loading = useAsync({
    promiseFn: loadSCEPServers,
    onResolve: (data) => newServers(data && data.scep ? data.scep : []),
  });

  return (
    <>
      <h2 className="display-3">SCEP Servers</h2>
      <ServersContext.Provider
        value={{
          servers,
          selected,
          newServers,
          add: addServers,
          delete: delServer,
          update: updateServer,
          reload: loading.reload,
          select: selectServer,
          deselect: deselectServer,
          clearSelection,
          selectAll,
        }}
      >
        <ActionPanel />
        <ServersTable state={loading} />
      </ServersContext.Provider>
    </>
  );
};

SCEPServers.propTypes = {};

SCEPServers.defaultProps = {};

export default SCEPServers;
