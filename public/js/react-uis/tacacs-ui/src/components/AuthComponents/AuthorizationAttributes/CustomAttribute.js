import React from "react";
import { Field, getIn, connect } from "formik";

import {
  EditableSelect,
  Input,
  Icon,
  Button,
  ButtonGroup,
} from "react-cui-2.0";

const RFC_CONSTANTS = [
  ["protocol", "String"],
  ["cmd", "String"],
  ["cmd-arg", "String"],
  ["acl", "Numeric"],
  ["inacl", "String"],
  ["outacl", "String"],
  ["addr", "IP-Address"],
  ["addr-pool", "String"],
  ["routing", "Boolean"],
  ["route", "String"],
  ["timeout", "Numeric"],
  ["idletime", "Numeric"],
  ["autocmd", "String"],
  ["noescape", "Boolean"],
  ["nohangup", "Boolean"],
  ["priv-lvl", "Numeric"],
  ["remote_user", "String"],
  ["remote_host", "String"],
];

const customAttribute = ({ prefix, onDelete, formik }) => {
  return (
    <div className="row half-margin-top">
      <div className="col-md-5 col-lg-4 col-xl-3">
        <Field
          name={`${prefix}.attr`}
          component={EditableSelect}
          title="Attribute"
          prompt="Select attribute"
          id={`${prefix}.attr`}
        >
          {RFC_CONSTANTS.map(([attr, type]) => (
            <option id={attr} value={attr} key={attr}>
              {attr}
              <span className="text-muted half-margin-left text-small">{`(${type})`}</span>
            </option>
          ))}
        </Field>
      </div>
      <div className="col-md-7 col-lg-8 col-xl-9 flex">
        <Field
          component={Input}
          name={`${prefix}.value`}
          label="Value"
          className="half-margin-right flex-fill"
        />
        {getIn(formik.values, `${prefix}.service`) === "shell" ? null : (
          <ButtonGroup square className="base-margin-top">
            <Button
              type="button"
              icon
              color="link"
              title="Remove"
              onClick={onDelete}
            >
              <Icon icon="remove" />
            </Button>
          </ButtonGroup>
        )}
      </div>
    </div>
  );
};

export default connect(customAttribute);
