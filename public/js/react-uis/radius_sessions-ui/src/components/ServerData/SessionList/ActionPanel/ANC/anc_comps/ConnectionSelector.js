import React from "react";
import { Select } from "react-cui-2.0";

import { ConnectionsContext, BlockerContext } from "../anc_contexts";

export const ConnectionSelector = (props) => {
  const connections = React.useContext(ConnectionsContext);
  const blocked = React.useContext(BlockerContext);

  return (
    <Select
      title="Connection"
      prompt="Select connection"
      id="connection-selector"
      disabled={blocked}
      {...props}
    >
      {connections.map((con) => {
        const opts = {};
        if (con.attributes.state !== "ENABLED") opts.disabled = "disabled";
        return (
          <option id={con.id} value={con.id} key={con.id} {...opts}>
            {con.friendlyName}
            {opts.disabled ? " (not enabled)" : ""}
          </option>
        );
      })}
    </Select>
  );
};
