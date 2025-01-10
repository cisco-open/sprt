import React from "react";

import { ButtonGroup } from "react-cui-2.0";

import Filter from "./Filter";
import Remove from "./Remove";
import Accounting from "./Accounting";
import Guest from "./Guest";
import Checker from "./Checker";
import ANC from "./ANC";

export const ActionPanel = () => {
  return (
    <div className="panel position-sticky actions no-padding-left no-padding-right">
      <div className="flex-center-vertical">
        <ButtonGroup square>
          <Accounting />
        </ButtonGroup>
        <div className="divider" />
        <ButtonGroup square>
          <Guest />
          <ANC />
        </ButtonGroup>
        <div className="divider" />
        <Filter />
        <div className="divider" />
        <ButtonGroup square>
          <Remove />
        </ButtonGroup>
      </div>
      <Checker />
    </div>
  );
};
