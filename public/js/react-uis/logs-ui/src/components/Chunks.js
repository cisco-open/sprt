/* eslint-disable import/prefer-default-export */
/* eslint-disable react/prop-types */
import React from "react";

import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";

import {
  Spinner as Loader,
  Alert,
  Dropdown,
  Button,
  ButtonGroup,
  Label,
  DisplayIf as If,
} from "react-cui-2.0";
import { ErrorDetails } from "my-utils";

import Fade from "animations/Fade";

import { getChunkPreview, downloadLogFile } from "../actions";

import { ActionPanel } from "./ActionPanel";
import { Logs } from "./Logs";
import { TablePagination } from "./TablePagination";

const Preview = ({ show, chunk, owner, elRef }) => {
  const loadState = useAsync({
    deferFn: getChunkPreview,
    defer: true,
    owner,
    chunk,
  });

  React.useEffect(() => {
    if (show) loadState.run();
  }, [show]);

  return (
    <Fade in={show} enter exit appear={false} unmountOnExit mountOnEnter>
      <div
        className="panel panel--bordered panel--raised log-preview"
        style={{
          position: "absolute",
          top: `${(elRef.current ? elRef.current.offsetTop : -9999) + 25}px`,
          left: `${elRef.current ? elRef.current.offsetLeft : -9999}px`,
          zIndex: 1040,
        }}
      >
        <IfPending state={loadState}>Loading...</IfPending>
        <IfRejected state={loadState}>
          {(error) => (
            <Alert type="error" title="Operation failed">
              {"Couldn't get logs data: "}
              {error.message}
              <ErrorDetails error={error} />
            </Alert>
          )}
        </IfRejected>
        <IfFulfilled state={loadState}>
          {(data) =>
            data.logs ? (
              <Logs
                logs={data.logs}
                style={{
                  maxWidth: "700px",
                  maxHeight: "400px",
                  overflow: "hidden",
                }}
              />
            ) : (
              "Nothing"
            )
          }
        </IfFulfilled>
      </div>
    </Fade>
  );
};

const Download = ({ owner, chunk }) => {
  const [downloading, setDownloading] = React.useState(false);

  const download = async (format) => {
    setDownloading(true);
    try {
      await downloadLogFile(owner, chunk, format);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dropdown
      tail
      openTo="left"
      type="link"
      className={`no-decor${downloading ? " disabled" : ""}`}
      alwaysClose
      header={
        <span
          className={downloading ? "icon-animation spin " : "icon-download"}
        />
      }
    >
      <a className="panel" onClick={() => download("txt")}>
        <span className="half-margin-right icon-file-text-o" />
        As TXT
      </a>
      <a className="panel" onClick={() => download("zip")}>
        <span className="half-margin-right icon-file-archive-o" />
        As ZIP
      </a>
    </Dropdown>
  );
};

const labelsMap = [
  { pt: /__api/, color: "dark", display: "api" },
  { pt: /__watcher$/, color: "light", display: "watcher" },
  { pt: /__generator$/, color: "secondary", display: "generator" },
  { pt: /__udp_server$/, color: "warning-alt", display: "coa" },
];

const Labels = ({ owner }) => {
  return labelsMap
    .filter((l) => l.pt.test(owner))
    .map(({ color, display }) => (
      <Label
        size="tiny"
        color={color}
        className="half-margin-left"
        key={display}
      >
        {display}
      </Label>
    ));
};

const Chunk = ({ ch: { owner, chunk, count, started }, pickChunk, remove }) => {
  const [showPreview, setPreview] = React.useState(false);

  const elRef = React.useRef();

  return (
    <tr>
      <td>
        <a className="logs-link" onClick={() => pickChunk(chunk, owner)}>
          <span
            className="icon-search icon-small half-margin-right"
            onMouseEnter={() => setPreview(true)}
            onMouseLeave={() => setPreview(false)}
            ref={elRef}
          />
          <Preview
            show={showPreview}
            chunk={chunk}
            owner={owner}
            elRef={elRef}
          />
          {count}
          {" message"}
          {count > 1 ? "s" : ""}
        </a>
        <Labels owner={owner} />
        <span className="text-muted half-margin-left text-xsmall">{chunk}</span>
      </td>
      <td className="text-right">{started}</td>
      <td style={{ overflow: "unset" }} className="text-center">
        <Download owner={owner} chunk={chunk} />
        <a className="qtr-margin-left" onClick={() => remove(chunk)}>
          <span className="icon-trash icon-small" />
        </a>
      </td>
    </tr>
  );
};

export const Chunks = ({ chunks, pickChunk, switchMode, remove, loading }) => {
  const [paging, setPaging] = React.useState({
    limit: 25,
    offset: 0,
    total: Array.isArray(chunks) ? chunks.length : 0,
  });

  const have = React.useMemo(
    () =>
      Array.isArray(chunks)
        ? chunks.slice(paging.offset, paging.offset + paging.limit)
        : [],
    [paging, chunks]
  );

  const updPaging = React.useCallback(
    ({ limit, offset }) =>
      setPaging((prev) => ({
        ...prev,
        offset: typeof offset === "undefined" ? prev.offset : offset,
        limit: typeof limit === "undefined" ? prev.limit : limit,
      })),
    []
  );

  React.useEffect(
    () =>
      setPaging((prev) => ({
        ...prev,
        total: Array.isArray(chunks) ? chunks.length : 0,
      })),
    [chunks]
  );

  return (
    <>
      <ActionPanel>
        <div className="flex-fluid">
          <ButtonGroup square>
            <Button.Light onClick={switchMode}>
              <span className="icon icon-list-view half-margin-right" />
              <span className="title">Switch to logs</span>
            </Button.Light>
            <Button.Light onClick={() => remove("all")}>
              <span className="icon-trash half-margin-right" />
              <span>Remove all</span>
            </Button.Light>
          </ButtonGroup>
        </div>
        <If condition={Array.isArray(chunks) && chunks.length}>
          <TablePagination paging={paging} updPaging={updPaging} />
        </If>
      </ActionPanel>
      {loading ? (
        <Loader />
      ) : (
        <If condition={!!have.length}>
          <div className="responsive-table" style={{ overflow: "unset" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Chunk</th>
                  <th
                    className="text-right"
                    style={{ maxWidth: "200px", width: "200px" }}
                  >
                    Started
                  </th>
                  <th style={{ width: "70px" }}>&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {have.map((ch) => (
                  <Chunk
                    key={ch.chunk}
                    ch={ch}
                    pickChunk={pickChunk}
                    remove={remove}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </If>
      )}
    </>
  );
};
