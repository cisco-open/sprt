import React from "react";
import PropTypes from "prop-types";
import { useParams } from "react-router-dom";

import { Dropdown } from "react-cui-2.0";

import { SessionsContext } from "../../../../../contexts";
import AccountingContext from "./context";
import AccountingModal from "./Modal";
import { actionType } from "./types";

const Drops = ({ sessions, selected, setModal, bulk }) => (
  <Dropdown
    className="btn--light"
    header={
      <>
        <span className="icon-blocked half-margin-right" />
        <span className="btn--label">Drop</span>
      </>
    }
    alwaysClose
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
      Drop selected sessions
    </a>
    <a className="panel" onClick={() => setModal(`bulk:${bulk}`)}>
      Drop all sessions
    </a>
  </Dropdown>
);

Drops.propTypes = {
  sessions: PropTypes.arrayOf(PropTypes.any).isRequired,
  selected: PropTypes.arrayOf(PropTypes.any).isRequired,
  setModal: PropTypes.func.isRequired,
  bulk: PropTypes.string.isRequired,
};

const Interims = ({ sessions, selected, setModal, bulk }) => (
  <Dropdown
    className="btn--light"
    header={
      <>
        <span className="icon-refresh half-margin-right" />
        <span className="btn--label">Accounting</span>
      </>
    }
    alwaysClose
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
      Send Interim-Update on selected sessions
    </a>
    <a className="panel" onClick={() => setModal(`bulk:${bulk}`)}>
      Send Interim-Update on all sessions
    </a>
  </Dropdown>
);

Interims.propTypes = {
  sessions: PropTypes.arrayOf(PropTypes.any).isRequired,
  selected: PropTypes.arrayOf(PropTypes.any).isRequired,
  setModal: PropTypes.func.isRequired,
  bulk: PropTypes.string.isRequired,
};

const noModal = { what: null, action: null };

const Accounting = () => {
  const {
    sessions,
    selection: { selected },
  } = React.useContext(SessionsContext);
  const { bulk } = useParams();
  const [modal, setModal] = React.useState(noModal);

  return (
    <>
      <Interims
        sessions={sessions}
        selected={selected}
        setModal={(what) => setModal({ what, action: actionType.update })}
        bulk={bulk}
      />
      <Drops
        sessions={sessions}
        selected={selected}
        setModal={(what) => setModal({ what, action: actionType.drop })}
        bulk={bulk}
      />
      <AccountingContext.Provider
        value={{
          toUpdate: modal.what,
          action: modal.action,
          closeModal: () => setModal(noModal),
        }}
      >
        <AccountingModal />
      </AccountingContext.Provider>
    </>
  );
};

export default Accounting;
