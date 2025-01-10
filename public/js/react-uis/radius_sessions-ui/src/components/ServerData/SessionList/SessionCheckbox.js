import React from "react";
import PropTypes from "prop-types";

import { Checkbox } from "react-cui-2.0";
import { SessionsContext } from "../../../contexts";

export const SessionCheckbox = ({ id }) => {
  const {
    selection: { selected, select, deselect },
    block: { blocked },
  } = React.useContext(SessionsContext);

  return blocked.includes(id) ? (
    <div className="text-center">
      <span
        className="icon-animation spin"
        aria-hidden
        title="Session is blocked due to some job."
      />
    </div>
  ) : (
    <Checkbox
      field={{
        onChange: () => (selected.includes(id) ? deselect(id) : select(id)),
        name: `radius-${id}`,
      }}
      form={{
        touched: {},
        error: {},
        values: {
          [`radius-${id}`]: selected.includes(id),
        },
      }}
    />
  );
};

SessionCheckbox.propTypes = {
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};
