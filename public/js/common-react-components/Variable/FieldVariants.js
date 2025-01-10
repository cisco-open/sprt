import React from "react";

import { VariantSelectorFormik } from "my-composed/VariantSelectorFormik";

import VarHOC from "./VarHOC";
import { VarContext } from "./utils";

const FieldVariants = ({ f, postfix }) => {
  const { field, rebuildDependands } = React.useContext(VarContext);
  const fieldName = f.name ? field.name + postfix + f.name : field.name;

  return (
    <VariantSelectorFormik
      variants={f.value.map((v) => ({
        variant: v.name,
        display: v.short,
        component: (
          <div className="tab animated fadeIn fast active-tab" key={v.name}>
            <VarHOC
              data={v.fields}
              postfix={`${postfix}${f.name ? `${f.name}.` : ""}`}
            />
          </div>
        ),
        selected: v.selected || f.selected === v.name,
      }))}
      inline={f.inline}
      varPrefix={fieldName}
      title={f.title || f.label}
      onChange={(value) =>
        rebuildDependands({
          value,
          fieldName: `${fieldName}.variant`,
          dependants: f.dependants,
          select_dependant: f.select_dependant || {},
          show_if_checked: f.dependants ? f.show_if_checked : undefined,
        })
      }
    />
  );
};

export default FieldVariants;
