import React from "react";

import { Checkbox } from "react-cui-2.0";
import { SessionsContext } from "../../contexts";

export const SessionCheckbox = ({ id }) => (
  <SessionsContext.Consumer>
    {({ selection: { selected, select, deselect } }) => (
      <Checkbox
        field={{
          onChange: () => (selected.includes(id) ? deselect(id) : select(id)),
          name: `tacacs-${id}`,
        }}
        form={{
          touched: {},
          error: {},
          values: {
            [`tacacs-${id}`]: selected.includes(id),
          },
        }}
      />
    )}
  </SessionsContext.Consumer>
);
