import React from "react";
import PropTypes from "prop-types";

import { Checkbox } from "react-cui-2.0";

export const SelectionCheckbox = ({ id, selected, select, deselect }) => (
  <Checkbox
    field={{
      onChange: () => (selected.includes(id) ? deselect(id) : select(id)),
      name: `scep-server-${id}`,
    }}
    form={{
      touched: {},
      error: {},
      values: {
        [`scep-server-${id}`]: selected.includes(id),
      },
    }}
  />
);

SelectionCheckbox.propTypes = {
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  selected: PropTypes.arrayOf(PropTypes.any).isRequired,
  select: PropTypes.func.isRequired,
  deselect: PropTypes.func.isRequired,
};
