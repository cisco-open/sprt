import React from "react";

import { Dropdown, confirmation, toast } from "react-cui-2.0";

import { deleteSCEP } from "../../../actions";
import { ServersContext } from "../../../contexts";
import {
  notifyOfError,
  notifyFromError,
  isSuccess,
} from "../../EditScepForm/utils";

export const RemoveScep = () => {
  const { selected, servers, newServers, clearSelection } = React.useContext(
    ServersContext
  );

  const deleteHandle = React.useCallback(
    (what) => {
      confirmation(
        <>
          {"Are you sure you would like to delete "}
          {Array.isArray(what) ? (
            what.length === 1 ? (
              <span className="text-bold">
                {servers.find((s) => s.id === what[0]).name}
              </span>
            ) : (
              <>
                <span className="text-bold">{what.length}</span>
                {" servers"}
              </>
            )
          ) : (
            <>
              <span className="text-bold">{what}</span>
              {" servers"}
            </>
          )}
          ?
        </>,
        async () => {
          try {
            const r = await deleteSCEP(what);
            if (isSuccess(r)) {
              toast.success("", "Server deleted");
              clearSelection();
              newServers(r.scep || []);
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
    [servers, newServers, clearSelection]
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
        Remove selected SCEP servers
      </a>
      <a className="panel" onClick={() => deleteHandle("all")}>
        Remove all SCEP servers
      </a>
    </Dropdown>
  );
};

RemoveScep.propTypes = {};

RemoveScep.defaultProps = {};
