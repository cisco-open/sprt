import React from "react";

import { Spinner as Loader, Button, ButtonGroup } from "react-cui-2.0";

import { ActionPanel } from "./ActionPanel";
import { Logs } from "./Logs";

export const OneChunk = ({ data, pickChunk, remove, loading }) => (
  <>
    <ActionPanel>
      <ButtonGroup square>
        <Button.Light onClick={() => pickChunk("")}>
          <span className="icon icon-arrow-left-tail half-margin-right" />
          <span className="title">Back to chunks</span>
        </Button.Light>
        <Button.Light onClick={() => remove(data.chunk)}>
          <span className="icon-trash half-margin-right" />
          <span>Remove chunk</span>
        </Button.Light>
      </ButtonGroup>
    </ActionPanel>
    {loading ? <Loader /> : data.logs ? <Logs logs={data.logs} /> : null}
  </>
);
