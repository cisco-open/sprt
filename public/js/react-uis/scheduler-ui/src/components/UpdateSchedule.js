import React from "react";
import { Field, connect, getIn } from "formik";

import {
  Input,
  Textarea,
  EditableSelect,
  Accordion,
  AccordionElement,
} from "react-cui-2.0";

import { ByCron } from "./CronSchedule";

const SessionTime = ({ name, fieldName, readonly, values }) => {
  const allowedValues = React.useMemo(
    () => values.reduce((prev, v) => [...prev, v.value], []),
    [values]
  );

  return (
    <Field
      name={fieldName}
      component={EditableSelect}
      title={name}
      disabled={readonly}
      type="text"
      prompt="Select an option or enter a number"
      validate={(v) => {
        if (parseInt(v, 10) !== v && !allowedValues.includes(v))
          return "Incorrect value";
        return undefined;
      }}
    >
      {values.map((v) => (
        <option key={v.value} value={v.value}>
          {v.title}
        </option>
      ))}
    </Field>
  );
};

const ComponentOrField = ({
  name,
  value,
  component,
  readonly,
  idx,
  prefix,
  fieldComponent,
  ...rest
}) =>
  component ? (
    React.createElement(component, {
      fieldName: `${prefix}.${idx}.value`,
      name,
      value,
      readonly,
      prefix,
      idx,
      ...rest,
    })
  ) : (
    <Field
      component={fieldComponent || Input}
      name={`${prefix}.${idx}.value`}
      label={name}
      disabled={readonly}
      {...rest}
    />
  );

const Columns = ({ values, prefix, idx }) => (
  <div className="row half-margin-top">
    {values.map((v, innerIdx) => (
      <div key={innerIdx} className="col">
        <ComponentOrField
          {...v}
          idx={innerIdx}
          prefix={`${prefix}.${idx}.values`}
        />
      </div>
    ))}
  </div>
);

const DEFAULT_ATTRIBUTES = [
  { value: "Interim-Update", name: "Acct-Status-Type", readonly: true },
  { value: "$SESSIONID$", name: "Acct-Session-Id", readonly: true },
  { value: "$MAC$", name: "Calling-Station-Id", readonly: true },
  {
    component: SessionTime,
    value: "Seconds since creation",
    name: "Acct-Session-Time",
    values: [
      { value: "Seconds since creation", title: "Seconds since creation" },
      {
        value: "Seconds since last change",
        title: "Seconds since last change",
      },
    ],
  },
  {
    component: Columns,
    values: [
      { value: 0, name: "Acct-Input-Octets", type: "number", min: 0 },
      { value: 0, name: "Acct-Input-Packets", type: "number", min: 0 },
    ],
  },
  {
    component: Columns,
    values: [
      { value: 0, name: "Acct-Output-Octets", type: "number", min: 0 },
      { value: 0, name: "Acct-Output-Packets", type: "number", min: 0 },
    ],
  },
  { value: "$IP$", name: "Framed-IP-Address", readonly: true },
  {
    value: "",
    name: "Additional attributes",
    fieldComponent: Textarea,
    rows: 5,
  },
];

const Attributes = connect(({ formik, prefix }) => {
  React.useEffect(() => {
    formik.setFieldValue(
      prefix,
      getIn(formik.values, prefix, DEFAULT_ATTRIBUTES),
      false
    );

    return () => {
      formik.setFieldValue(prefix, undefined, false);
      formik.unregisterField(prefix);
    };
  }, []);

  return (
    <Accordion toggles>
      <AccordionElement title="Attributes">
        {getIn(formik.values, prefix, []).map((v, idx) => (
          <ComponentOrField
            {...v}
            idx={idx}
            prefix={prefix}
            key={`${prefix}-${idx}`}
          />
        ))}
      </AccordionElement>
    </Accordion>
  );
});

export const UpdateSchedule = () => {
  return (
    <div className="tab animated fadeIn fast active-tab">
      <div className="half-margin-bottom">
        <ByCron prefix="scheduler.updates.cron" title="Interim updates on:" />
      </div>
      <Attributes prefix="scheduler.updates.attributes" />
    </div>
  );
};
