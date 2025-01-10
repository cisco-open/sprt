import React from "react";

import {
  Spinner as Loader,
  Button,
  ButtonGroup,
  Pagination,
} from "react-cui-2.0";

import { ActionPanel } from "./ActionPanel";
import { Logs } from "./Logs";

export const NoChunks = ({
  data,
  switchMode,
  remove,
  loading,
  changePosition,
}) => (
  <>
    <ActionPanel>
      <div className="flex-fluid">
        <ButtonGroup square>
          <Button.Light onClick={switchMode}>
            <span className="icon icon-layers half-margin-right" />
            <span className="title">Switch to chunks</span>
          </Button.Light>
          <Button.Light onClick={() => remove("all")}>
            <span className="icon-trash half-margin-right" />
            <span>Remove all</span>
          </Button.Light>
        </ButtonGroup>
      </div>

      {data.total ? (
        <>
          <Pagination
            icons
            beginAt={0}
            size="small"
            total={parseInt(data.total, 10)}
            perPage={parseInt(data.limit, 10)}
            onPageChange={(_e, position) => changePosition(position)}
            position={parseInt(data.offset, 10)}
            className="no-margin-top"
          />
        </>
      ) : null}
    </ActionPanel>
    {loading ? (
      <Loader />
    ) : data.logs ? (
      <Logs logs={data.logs} showOwner />
    ) : null}
  </>
);
