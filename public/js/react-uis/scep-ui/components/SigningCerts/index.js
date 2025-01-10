import React from "react";
import { useAsync } from "react-async";

import { SigningCertsContext } from "../../contexts";
import { loadSigningCerts } from "../../actions";
import { arrayReducer } from "../../reducers";

import SignersTable from "./Table";
import ActionPanel from "./ActionPanel";

const actions = {
  new: "signers/new",
  add: "signers/add",
  del: "signers/del",
  upd: "signers/update",
};

const SigningCertificates = () => {
  const [signers, dispatch] = React.useReducer(arrayReducer(actions), []);
  const [selected, setSelected] = React.useState([]);

  const selectSigner = React.useCallback(
    (id) => setSelected((curr) => (curr.includes(id) ? curr : [...curr, id])),
    []
  );
  const deselectSigner = React.useCallback(
    (id) =>
      setSelected((curr) =>
        curr.includes(id) ? curr.filter((checkId) => checkId !== id) : curr
      ),
    []
  );
  const clearSelection = React.useCallback(() => setSelected([]), []);
  const selectAll = React.useCallback(
    () =>
      setSelected(() => signers.reduce((all, curr) => [...all, curr.id], [])),
    [signers]
  );

  const newSigners = React.useCallback(
    (payload) => dispatch({ type: actions.new, payload }),
    []
  );
  const addSigners = React.useCallback((payload) => {
    dispatch({ type: actions.add, payload });
  }, []);
  const delSigner = React.useCallback((id) => {
    dispatch({ type: actions.del, payload: id });
  }, []);
  const updateSigner = React.useCallback((payload) => {
    dispatch({ type: actions.upd, payload });
  }, []);

  const loading = useAsync({
    promiseFn: loadSigningCerts,
    onResolve: (data) => newSigners(data && data.signers ? data.signers : []),
  });

  return (
    <>
      <h2 className="display-3 no-margin">Signing Certificates</h2>
      <h5 className="base-margin-bottom subheading">
        Certificates used to sign CSRs sent to a SCEP server
      </h5>
      <SigningCertsContext.Provider
        value={{
          signers,
          selected,
          add: addSigners,
          delete: delSigner,
          update: updateSigner,
          reload: loading.reload,
          select: selectSigner,
          deselect: deselectSigner,
          selectAll,
          clearSelection,
          newSigners,
        }}
      >
        <ActionPanel />
        <SignersTable state={loading} />
      </SigningCertsContext.Provider>
    </>
  );
};

SigningCertificates.propTypes = {};

SigningCertificates.defaultProps = {};

export default SigningCertificates;
