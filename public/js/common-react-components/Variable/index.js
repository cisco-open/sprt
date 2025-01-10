import React from "react";

import { VarContext } from "./utils";
import VarHOC from "./VarHOC";

const variableBuilder = ({ form, field, data }) => {
  const rebuildDependands = obj => {};
  const updateOnChange = () => {};

  return (
    <VarContext.Provider
      value={{ form, field, rebuildDependands, updateOnChange }}
    >
      <VarHOC data={data} postfix="." />
    </VarContext.Provider>
  );
};

export default variableBuilder;
