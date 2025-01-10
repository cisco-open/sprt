import React from "react";

import Span from "var-builder/Span";
import OptionsSectionHeader from "../../common/OptionsSectionHeader";
import Sequence from "./Sequence";

const attributes = () => (
  <>
    <OptionsSectionHeader title="Authorization & Accounting" />
    <div className="panel-body">
      <Sequence />
      <Span
        f={{
          name: "head",
          value: `If authentication was successful, all these authorization & accounting requests will be sent in the configured order.
If a command set selected for a request, an authorization request will be sent for each command in the set.`,
        }}
      />
    </div>
  </>
);

export default attributes;
