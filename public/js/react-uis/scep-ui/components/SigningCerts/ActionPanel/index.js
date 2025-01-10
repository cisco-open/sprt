import React from "react";

import { ButtonGroup } from "react-cui-2.0";

import Add from "./Add";
import Remove from "./Remove";
import { Rename, Details, Export } from "./Existing";

const ActionPanel = () => {
  return (
    <div className="panel position-sticky actions no-padding-left no-padding-right">
      <div className="flex-center-vertical">
        <ButtonGroup square>
          <Add />
        </ButtonGroup>
        <div className="divider" />
        <ButtonGroup square>
          <Rename />
          <Details />
          <Export />
        </ButtonGroup>
        <div className="divider" />
        <ButtonGroup square>
          <Remove />
        </ButtonGroup>
      </div>
    </div>
  );
};

ActionPanel.propTypes = {};

ActionPanel.defaultProps = {};

export default ActionPanel;
