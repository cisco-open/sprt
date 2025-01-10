import React from "react";

import { Dropdown, confirmation, toast } from "react-cui-2.0";

import { SigningCertsContext } from "../../../contexts";
import { deleteSigners } from "../../../actions";

import {
  notifyOfError,
  notifyFromError,
  isSuccess,
} from "../../EditScepForm/utils";

const Remove = () => {
  const { selected, signers, newSigners, clearSelection } = React.useContext(
    SigningCertsContext
  );

  const deleteHandle = React.useCallback(
    (what) => {
      confirmation(
        <>
          {"Are you sure you would like to delete "}
          {Array.isArray(what) ? (
            what.length === 1 ? (
              <span className="text-bold">
                {signers.find((s) => s.id === what[0]).friendly_name}
              </span>
            ) : (
              <>
                <span className="text-bold">{what.length}</span>
                {" certificates"}
              </>
            )
          ) : (
            <>
              <span className="text-bold">{what}</span>
              {" certificates"}
            </>
          )}
          ?
        </>,
        async () => {
          try {
            const r = await deleteSigners(what);
            if (isSuccess(r)) {
              toast.success("", "Server deleted");
              clearSelection();
              newSigners(r.signers || []);
              return true;
            }

            notifyFromError(r.error);
          } catch (e) {
            notifyOfError("Something went wrong", e);
          }
          return false;
        },
        "danger"
      );
    },
    [signers, newSigners, clearSelection]
  );

  return (
    <Dropdown
      tail
      className="btn--light"
      header={
        <>
          <span className="icon-trash half-margin-right" />
          <span className="btn--label">Remove</span>
        </>
      }
      alwaysClose
      openTo="left"
    >
      <a
        className="panel"
        disabled={!Array.isArray(selected) || selected.length !== 1}
        onClick={() => deleteHandle(selected)}
      >
        Remove selected certificates
      </a>
      <a className="panel" onClick={() => deleteHandle("all")}>
        Remove all certificates
      </a>
    </Dropdown>
  );
};

Remove.propTypes = {};

Remove.defaultProps = {};

export default Remove;
