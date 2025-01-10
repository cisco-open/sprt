import React from "react";
import { Field, getIn, connect } from "formik";

import { Select, Icon, Button, ButtonGroup } from "react-cui-2.0";

const Cmd = ({ prefix, formik, onDelete }) => {
  const [cmds, setCmds] = React.useState([]);
  const fieldName = `${prefix}.cmd`;

  React.useEffect(() => {
    setCmds([
      { id: "null", name: "Empty" },
      ...getIn(formik.values, "commands.order", []).map((id) => ({
        id,
        name: getIn(formik.values, ["commands", id, "name"]),
      })),
    ]);
    if (!getIn(formik.values, fieldName, undefined))
      formik.setFieldValue(fieldName, "null", false);
  }, []);

  return (
    <div className="flex half-margin-top">
      <Field
        name={fieldName}
        component={Select}
        title="Command set"
        prompt="Select command set"
        id={fieldName}
        className="flex-fill"
      >
        {cmds.map(({ id, name }) => (
          <option id={id} value={id} key={id}>
            {name}
          </option>
        ))}
      </Field>
      {getIn(formik.values, `${prefix}.service`) === "shell" ? null : (
        <ButtonGroup square className="half-margin-left base-margin-top">
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
  );
};

export default connect(Cmd);
