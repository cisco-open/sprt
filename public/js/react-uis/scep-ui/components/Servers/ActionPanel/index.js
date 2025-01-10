import React from "react";

import { ButtonGroup } from "react-cui-2.0";

import { AddScep, EditScep, EditModal } from "./EditScep";
import { RemoveScep } from "./RemoveScep";

const ActionPanel = () => {
  return (
    <div className="panel position-sticky actions no-padding-left no-padding-right">
      <div className="flex-center-vertical">
        <ButtonGroup square>
          <AddScep />
        </ButtonGroup>
        <div className="divider" />
        <ButtonGroup square>
          <EditScep />
        </ButtonGroup>
        <div className="divider" />
        <ButtonGroup square>
          <RemoveScep />
        </ButtonGroup>
      </div>
      <EditModal />
    </div>
  );
};

ActionPanel.propTypes = {};

ActionPanel.defaultProps = {};

export default ActionPanel;
