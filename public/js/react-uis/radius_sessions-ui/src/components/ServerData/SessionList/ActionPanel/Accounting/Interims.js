import React from "react";
import { getIn, Field, useFormikContext } from "formik";

import {
  Select,
  Input,
  Checkbox,
  Button,
  Textarea,
  ConditionalWrapper as Wrapper,
  DisplayIf as If,
  Tabs,
  Tab,
} from "react-cui-2.0";

import APITab from "./APITab";
import ServerTab from "./ServerTab";

import { updateSessions } from "../../../../../actions";
import { UserContext } from "../../../../../contexts";
import AccountingContext from "./context";
import { selectedType } from "./types";

const AttributesTab = ({ selected }) => {
  const { values } = useFormikContext();

  return (
    <>
      <Field
        component={Select}
        name="acct-status-type"
        id="acct-status-type"
        title="Acct-Status-Type"
      >
        <option value="1">Start</option>
        <option value="3">Interim-Update</option>
        <option value="7">Accounting-On</option>
        <option value="8">Accounting-Off</option>
      </Field>
      <If condition={Array.isArray(selected) && selected.length === 1}>
        <>
          <Field
            name="acct-session-id"
            id="acct-session-id"
            component={Input}
            label="Acct-Session-Id"
            readOnly
          />
          <Field
            name="calling-station-id"
            id="calling-station-id"
            component={Input}
            label="Calling-Station-Id"
            readOnly
          />
        </>
      </If>
      <Wrapper
        condition={getIn(values, "acct-session-time-type") === "specified"}
        wrapper={<div className="row half-margin-top" />}
      >
        <Wrapper
          condition={getIn(values, "acct-session-time-type") === "specified"}
          wrapper={<div className="col" />}
        >
          <Field
            component={Select}
            name="acct-session-time-type"
            id="acct-session-time-type"
            title="Acct-Session-Time"
          >
            <option value="timeFromCreate">Seconds since creation</option>
            <option value="timeFromChange">Seconds since last change</option>
            <option value="specified">Specified</option>
          </Field>
        </Wrapper>
        <If condition={getIn(values, "acct-session-time-type") === "specified"}>
          <div className="col">
            <Field
              name="interim-session-time"
              id="interim-session-time"
              component={Input}
              type="number"
              label="Seconds"
              min={0}
            />
          </div>
        </If>
      </Wrapper>
      <div className="row half-margin-top">
        <div className="col">
          <Field
            name="input-octets"
            id="input-octets"
            component={Input}
            type="number"
            label="Acct-Input-Octets"
            min={0}
          />
        </div>
        <div className="col">
          <Field
            name="output-octets"
            id="output-octets"
            component={Input}
            type="number"
            label="Acct-Output-Octets"
            min={0}
          />
        </div>
      </div>
      <div className="row half-margin-top">
        <div className="col">
          <Field
            name="input-packets"
            id="input-packets"
            component={Input}
            type="number"
            label="Acct-Input-Packets"
            min={0}
          />
        </div>
        <div className="col">
          <Field
            name="output-packets"
            id="output-packets"
            component={Input}
            type="number"
            label="Acct-Output-Octets"
            min={0}
          />
        </div>
      </div>
      <If condition={Array.isArray(selected) && selected.length === 1}>
        <Field
          name="framed-ip-address"
          id="framed-ip-address"
          component={Input}
          label="Framed-IP-Address"
        />
      </If>
      <Field
        name="additional-attrs"
        id="additional-attrs"
        component={Textarea}
        rows={5}
        label="Additional attributes"
      />
      <Field name="async" id="async" component={Checkbox}>
        Multi-thread
      </Field>
    </>
  );
};

AttributesTab.propTypes = {
  selected: selectedType.isRequired,
};

const tabs = [
  {
    name: "attributes",
    title: "Attributes",
    component: AttributesTab,
  },
  {
    name: "server",
    title: "Server",
    component: ServerTab,
  },
  {
    name: "api",
    title: "API",
    component: APITab,
  },
];

const InterimBody = ({ selected }) => {
  const { api } = React.useContext(UserContext);

  return (
    <Tabs vertical defaultTab="attributes">
      {tabs
        .filter((t) => t.name !== "api" || (t.name === "api" && api))
        .map((t) => (
          <Tab title={t.title || t.name} id={t.name} key={t.name}>
            {React.createElement(t.component, { selected })}
          </Tab>
        ))}
    </Tabs>
  );
};

InterimBody.propTypes = {
  selected: selectedType.isRequired,
};

const InterimHeader = ({ selected }) => {
  const { toUpdate } = React.useContext(AccountingContext);

  if (typeof toUpdate === "string" && /bulk:.*/.test(toUpdate))
    return <h2 className="modal__title">Update all sessions</h2>;

  if (!selected) return <h2 className="modal__title">No sessions selected</h2>;

  if (selected.length === 1)
    return (
      <>
        <h2 className="modal__title">Update the session</h2>
        <div className="subheader">
          {"MAC: "}
          <span className="text-normal">{selected[0].mac}</span>
        </div>
      </>
    );

  return (
    <h2 className="modal__title">
      {"Update "}
      {selected.length}
      {" sessions"}
    </h2>
  );
};

InterimHeader.propTypes = {
  selected: selectedType.isRequired,
};

export const interimMapping = {
  initials: (selected) => ({
    "acct-status-type": "3",
    "acct-session-time-type": "timeFromCreate",
    "interim-session-time": 0,
    "input-octets": 0,
    "output-octets": 0,
    "input-packets": 0,
    "output-packets": 0,
    "additional-attrs": "",
    async: true,
    ...(Array.isArray(selected) && selected.length === 1
      ? {
          "acct-session-id": selected[0].sessid,
          "calling-station-id": selected[0].mac,
          "framed-ip-address": selected[0].ipAddr || "",
        }
      : {}),
  }),
  submitAction: updateSessions,
  body: InterimBody,
  header: InterimHeader,
  actionButton: (
    <Button color="primary" onClick={() => {}}>
      Update
    </Button>
  ),
};
