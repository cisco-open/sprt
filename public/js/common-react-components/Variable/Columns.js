import React from "react";

import VarHOC from "./VarHOC";

const Columns = ({ columns, postfix, ...rest }) => (
  <div className="row">
    {columns.map((c, idx) => (
      <div className="col" ket={`${postfix}-column-${idx}`}>
        <VarHOC data={c} postfix={postfix} {...rest} />
      </div>
    ))}
  </div>
);

export default Columns;
