import React from "react";
import { useParams } from "react-router-dom";

import { ConfirmationModal, toast, Dropdown } from "react-cui-2.0";

import { SessionsContext } from "../../../../contexts";
import { deleteSessions } from "../../../../actions";

const deletePrompt = (what) => {
  if (Array.isArray(what))
    return (
      <>
        {"Are you sure you want to delete "}
        <span className="text-bold">{what.length}</span>
        {` session${what.length > 1 ? "s" : ""}?`}
      </>
    );

  if (typeof what === "string") {
    if (/^bulk:/.test(what))
      return <>Are you sure you want to delete all sessions of the bulk?</>;

    switch (what) {
      case "dropped":
        return (
          <>Are you sure you want to delete all dropped/failed sessions?</>
        );
      case "outdated":
        return (
          <>
            Are you sure you want to delete all sessions which are older than 5
            days?
          </>
        );
      default:
        break;
    }
  }

  return null;
};

const RemoveDropdown = () => {
  const {
    sessions,
    selection: { selected, clear },
  } = React.useContext(SessionsContext);
  const { server, bulk } = useParams();
  const { reload } = React.useContext(SessionsContext);
  const [modal, setModal] = React.useState(null);

  return (
    <>
      <Dropdown
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
          disabled={!sessions.filter((v) => selected.includes(v.id)).length}
          onClick={() =>
            setModal(
              sessions.filter((v) => selected.includes(v.id)).map((s) => s.id)
            )
          }
        >
          Remove selected sessions
        </a>
        <a className="panel" onClick={() => setModal("dropped")}>
          Remove dropped/failed sessions
        </a>
        <a className="panel" onClick={() => setModal("outdated")}>
          Remove sessions older &gt; 5 days
        </a>
        <a className="panel" onClick={() => setModal(`bulk:${bulk}`)}>
          Remove all sessions
        </a>
      </Dropdown>
      <ConfirmationModal
        isOpen={Boolean(modal)}
        prompt={deletePrompt(modal)}
        confirmType="danger"
        confirmHandle={async () => {
          try {
            const r = await deleteSessions(server, bulk, modal);
            switch (r.type) {
              case "info":
                if (r.message) toast.info(undefined, r.message);
                setModal(null);
                return true;
              case "success":
                if (r.message) toast.success(undefined, r.message);
                clear();
                setModal(null);
                reload();
                return true;
              case "error":
                if (r.message) toast.error("Error", r.message, false);
                return true;
              default:
                return true;
            }
          } catch (e) {
            toast.error("Error", e.message, false);
            return true;
          }
        }}
        closeHandle={() => setModal(null)}
        confirmText="Delete"
      />
    </>
  );
};

export default RemoveDropdown;
