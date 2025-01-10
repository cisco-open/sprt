import React from "react";
import { connect, getIn, Field } from "formik";

import Span from "./Span";
import Div from "./Div";
import Columns from "./Columns";
import FieldInput from "./FieldInput";
import FieldCheckbox from "./FieldCheckbox";
import FieldTextarea from "./FieldTextarea";
import FieldRadio from "./FieldRadio";
import FieldVariants from "./FieldVariants";
import FieldSelect from "./FieldSelect";
import FieldAlert from "./FieldAlert";
import FieldDivider from "./FieldDivider";
import FieldDrawer from "./FieldDrawer";
import FieldCheckboxes from "./FieldCheckboxes";
import FieldDictionary from "./FieldDictionary";

const fieldDispatch = {
  alert: FieldAlert,
  checkbox: FieldCheckbox,
  checkboxes: FieldCheckboxes,
  columns: Columns,
  dictionary: FieldDictionary,
  div: Div,
  divider: FieldDivider,
  drawer: FieldDrawer,
  hidden: FieldInput,
  number: FieldInput,
  radio: FieldRadio,
  select: FieldSelect,
  span: Span,
  text: FieldInput,
  textarea: FieldTextarea,
  variants: FieldVariants
};

const VarHOC = ({ data, postfix }) => {
  return data.map((f, idx) => {
    if (fieldDispatch[f.type])
      return React.createElement(fieldDispatch[f.type], {
        f,
        postfix,
        key: f.name || idx
      });

    switch (f.type) {
      case "break":
        return null;
      default:
        return null;
      // case "multiple":
      //   checkPP();
      //   addFieldMultiple(parametersP, f);
      //   break;
      // case "group":
      //   checkPP();
      //   addFieldGroup(parametersP, f);
      //   break;
    }
  });
};

export default VarHOC;
