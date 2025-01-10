import React from "react";

import {
  Button,
  ButtonGroup,
  Dropdown,
  Input,
  ConfirmationModal,
  toast,
  Icon,
} from "react-cui-2.0";

import { SessionsContext, BulkContext } from "../../contexts";
import { deleteSessions } from "../../actions";

const Filter = () => {
  const { paging, updPaging } = React.useContext(SessionsContext);
  const [filter, setFilter] = React.useState(
    typeof paging === "object" ? paging.filter || "" : ""
  );

  const applyFilter = () => {
    if (!filter.trim() && !paging.filter) return;
    updPaging({ filter: filter.trim() }, false);
  };

  return (
    <>
      <Input
        type="text"
        name="filter"
        inline="both"
        placeholder="Filter"
        field={{
          onChange: (e) => setFilter(e.target.value),
          onKeyDown: (e) => {
            if (e.keyCode === 13) applyFilter();
          },
          value: filter,
          name: "filter",
        }}
        form={{
          touched: {},
          errors: {},
        }}
      />
      <ButtonGroup square>
        <Button.Link icon onClick={applyFilter}>
          <Icon icon="filter" />
        </Button.Link>
      </ButtonGroup>
    </>
  );
};

const deletePrompt = (what) => {
  if (Array.isArray(what))
    return (
      <>
        {"Are you sure you want to delete "}
        <span className="text-bold">{what.length}</span>
        {` session${what.length > 1 ? "s" : ""}?`}
      </>
    );

  if (/^bulk:/.test(what))
    return <>Are you sure you want to delete all sessions of the bulk?</>;

  if (what === "dropped")
    return <>Are you sure you want to delete all dropped/failed sessions?</>;

  if (what === "outdated")
    return (
      <>
        Are you sure you want to delete all sessions which are older than 5
        days?
      </>
    );

  return null;
};

export const ActionPanel = () => {
  const {
    sessions,
    selection: { selected, clear },
  } = React.useContext(SessionsContext);
  const { server, reloadBulks, ...bulk } = React.useContext(BulkContext);
  const [modal, setModal] = React.useState({ what: null });

  return (
    <div className="panel position-sticky actions no-padding-left no-padding-right">
      <div className="flex-center-vertical">
        <Filter />
        <div className="divider" />
        <ButtonGroup square>
          <Dropdown
            className="btn--light"
            header={
              <>
                <span className="icon-trash half-margin-right" />
                <span className="btn--label">Remove</span>
              </>
            }
          >
            <a
              className="panel"
              disabled={!sessions.filter((v) => selected.includes(v.id)).length}
              onClick={() =>
                setModal({
                  what: sessions
                    .filter((v) => selected.includes(v.id))
                    .map((s) => s.id),
                })
              }
            >
              Remove selected sessions
            </a>
            <a
              className="panel"
              onClick={() =>
                setModal({
                  what: "outdated",
                })
              }
            >
              Remove sessions older &gt; 5 days
            </a>
            <a
              className="panel"
              onClick={() =>
                setModal({
                  what: `bulk:${bulk.name}`,
                })
              }
            >
              Remove all sessions
            </a>
          </Dropdown>
        </ButtonGroup>
        <ConfirmationModal
          isOpen={Boolean(modal.what)}
          prompt={deletePrompt(modal.what)}
          confirmType="danger"
          confirmHandle={async () => {
            try {
              const r = await deleteSessions(server, bulk.name, modal.what);
              switch (r.type) {
                case "info":
                  if (r.message) toast.info(undefined, r.message);
                  setModal({ what: null });
                  return true;

                case "success":
                  if (r.message) toast.success(undefined, r.message);
                  clear();
                  setModal({ what: null });
                  reloadBulks();
                  return true;

                default:
                  throw new Error("Unknown response type");
              }
            } catch (e) {
              toast.error("Error", e.message, false);
              return true;
            }
          }}
          closeHandle={() => setModal({ what: null })}
          confirmText="Delete"
        />
      </div>
    </div>
  );
};
