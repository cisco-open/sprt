import React from "react";

import { useAsync } from "react-async";
import ReactJsonTree from "react-json-tree";

import {
  Alert,
  toast,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ConfirmationModal,
} from "react-cui-2.0";
import { base16Theme } from "my-react-cui/base16Theme";

import { copyStringToClipboard, ErrorDetails } from "my-utils";

import { getChunks, deleteChunk } from "../actions";
import { JsonViewContext } from "../contexts";
import { Chunks } from "./Chunks";
import { NoChunks } from "./NoChunks";
import { OneChunk } from "./OneChunk";

export default ({ owner, reload }) => {
  const [opts, setOpts] = React.useState({ no_chunks: false });
  const [data, setData] = React.useState({});
  const [modal, setModal] = React.useState(null);
  const [toRemove, setToRemove] = React.useState(null);

  const bRef = React.useRef();
  const tRef = React.useRef();

  const chunksLoadState = useAsync({
    deferFn: getChunks,
    defer: true,
    owner: owner.name,
    onResolve: (newData) => setData(newData),
    onReject: (err) => {
      if (err.response.status === 404) {
        reload();
      }
    },
  });

  React.useEffect(() => setOpts({ no_chunks: false }), [owner.reload]);
  React.useEffect(() => chunksLoadState.run(opts), [opts]);

  const pickChunk = (chunk, specOwner) =>
    setOpts({ chunk, owner: specOwner || owner.name });
  const switchMode = () =>
    setOpts((prev) => ({ ...prev, no_chunks: !prev.no_chunks }));
  const changePosition = (offset) => setOpts((prev) => ({ ...prev, offset }));
  const remove = (id) => setToRemove(id);

  const scrollTop = React.useCallback(
    () => tRef.current.scrollIntoView({ behavior: "smooth" }),
    []
  );
  const scrollBottom = React.useCallback(
    () => bRef.current.scrollIntoView({ behavior: "smooth" }),
    []
  );

  const showJson = (json) => setModal(json);

  return (
    <>
      <div style={{ float: "left", clear: "both" }} ref={tRef} />
      {chunksLoadState.error ? (
        <Alert type="error" title="Operation failed">
          {"Couldn't get server data: "}
          {chunksLoadState.error.message}
          <ErrorDetails error={chunksLoadState.error} />
        </Alert>
      ) : (
        <>
          <div className="flex-center-vertical">
            <h2 className="display-3 no-margin text-capitalize flex-fluid">
              {!opts.no_chunks && !opts.chunk ? "Chunks" : "Logs"}
            </h2>
          </div>
          <JsonViewContext.Provider value={{ showJson }}>
            {opts.chunk ? (
              <OneChunk
                data={data}
                pickChunk={pickChunk}
                remove={remove}
                loading={chunksLoadState.isPending}
              />
            ) : opts.no_chunks ? (
              <NoChunks
                data={data}
                pickChunk={pickChunk}
                switchMode={switchMode}
                remove={remove}
                changePosition={changePosition}
                loading={chunksLoadState.isPending}
              />
            ) : (
              <Chunks
                chunks={data.chunks}
                pickChunk={pickChunk}
                switchMode={switchMode}
                remove={remove}
                loading={chunksLoadState.isPending}
              />
            )}
          </JsonViewContext.Provider>
        </>
      )}
      <div
        style={{ float: "left", clear: "both" }}
        className="dbl-margin-bottom"
        ref={bRef}
      />
      <div
        style={{
          position: "fixed",
          right: "0",
          bottom: "0",
        }}
        className="btn-group fixed-right fixed-bottom base-margin-right half-margin-bottom emboss--large"
      >
        <Button.Dark
          className="btn--icon emboss--large"
          onClick={scrollBottom}
          title="Scroll bottom"
        >
          <span className="icon-arrow-down-tail" />
        </Button.Dark>
        <Button.Dark
          className="btn--icon emboss--large"
          onClick={scrollTop}
          title="Scroll top"
        >
          <span className="icon-arrow-up-tail" />
        </Button.Dark>
      </div>

      <Modal
        isOpen={Boolean(modal)}
        size="large"
        closeIcon
        closeHandle={() => setModal(null)}
        autoClose
        title="JSON"
      >
        <ModalBody className="text-left">
          <div className="text-monospace">
            <ReactJsonTree
              data={JSON.parse(modal)}
              theme={{
                ...base16Theme,
                base00: "var(--cui-background-inactive)",
              }}
              invertTheme={false}
              hideRoot
              shouldExpandNode={(_keyName, _data, level) => level <= 1}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setModal(null)}>
            Close
          </Button>
          <Button
            color="secondary"
            onClick={() => copyStringToClipboard(modal)}
          >
            Copy to clipboard
          </Button>
        </ModalFooter>
      </Modal>
      <ConfirmationModal
        isOpen={Boolean(toRemove)}
        prompt="Are you sure?"
        confirmType="danger"
        confirmHandle={async () => {
          try {
            const r = await deleteChunk(owner.name, toRemove);
            switch (r.state) {
              case "success":
                if (r.message) toast.success(undefined, r.message);
                else toast.success(undefined, "Successfully deleted");
                setToRemove(null);
                setOpts((prev) => ({ ...prev }));
                return true;

              case "info":
              default:
                if (r.message) toast.info(undefined, r.message);
                setToRemove(null);
                return true;
            }
          } catch (e) {
            toast.error("Error", e.message, false);
            return true;
          }
        }}
        closeHandle={() => setToRemove(null)}
        confirmText="Delete"
      />
    </>
  );
};
