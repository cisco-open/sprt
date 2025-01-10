import React from "react";

import { toast } from "react-cui-2.0";

import { loadValueFromLink } from "../my-actions";

import { DropdownWithValues, DropdownWithLoad } from "./Dropdowns";
import { VarContext } from "./utils";

export const ButtonSet = ({ buttons, setValue }) => {
  const { rebuildDependands } = React.useContext(VarContext);

  const dropdownButtonClick = async (
    e,
    { value, insert, link, api, dependants, select_dependant, show_if_checked }
  ) => {
    if (value) {
      if (insert) {
        setValue(value, true);
      } else {
        setValue(value);
      }
    } else if (link || api) {
      toast.info("Loading", "Loading data from server");
      try {
        const data = await loadValueFromLink({ api, link });
        setValue(data);
        toast.success("Loaded", "Data loaded");
      } catch (error) {
        toast.error("Operation failed", error.message, false);
        return;
      }
    }

    if (dependants)
      rebuildDependands({ dependants, show_if_checked, select_dependant });
  };

  return buttons.reverse().map((btn, idx) => {
    switch (btn.type) {
      case "dropdown":
        if (Array.isArray(btn.values))
          return (
            <DropdownWithValues
              {...btn}
              onClick={
                typeof btn.action === "function"
                  ? btn.action
                  : dropdownButtonClick
              }
              type="button"
              key={`btn-${idx}-${btn.name}`}
            />
          );
        if (btn.load_values)
          return (
            <DropdownWithLoad
              {...btn}
              onClick={
                typeof btn.action === "function"
                  ? btn.action
                  : dropdownButtonClick
              }
              type="button"
              key={`btn-${idx}-${btn.name}`}
            />
          );
      case "component":
        return btn.component;
      default:
        return null;
    }
  });
};
