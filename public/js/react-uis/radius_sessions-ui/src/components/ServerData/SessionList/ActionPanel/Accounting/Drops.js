import React from "react";
import { getIn, Field, useFormikContext } from "formik";

import {
  Select,
  Input,
  Checkbox,
  Button,
  ConditionalWrapper as Wrapper,
  DisplayIf as If,
  Tabs,
  Tab,
} from "react-cui-2.0";

import APITab from "./APITab";
import ServerTab from "./ServerTab";

import { dropSessions } from "../../../../../actions";
import { UserContext } from "../../../../../contexts";
import AccountingContext from "./context";
import { selectedType } from "./types";

const AttributesTab = ({ selected }) => {
  const { values } = useFormikContext();

  return (
    <>
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
      <Field
        component={Select}
        name="terminate-cause"
        id="terminate-cause"
        title="Acct-Terminate-Cause"
      >
        <option value="1">User Request</option>
        <option value="2">Lost Carrier</option>
        <option value="3">Lost Service</option>
        <option value="4">Idle Timeout</option>
        <option value="5">Session Timeout</option>
        <option value="6">Admin Reset</option>
        <option value="7">Admin Reboot</option>
        <option value="8">Port Error</option>
        <option value="9">NAS Error</option>
        <option value="10">NAS Request</option>
        <option value="11">NAS Reboot</option>
        <option value="12">Port Unneeded</option>
        <option value="13">Port Preempted</option>
        <option value="14">Port Suspended</option>
        <option value="15">Service Unavailable</option>
        <option value="16">Callback</option>
        <option value="17">User Error</option>
        <option value="18">Host Request</option>
      </Field>
      <Wrapper
        condition={getIn(values, "drop-acct-session-time-type") === "specified"}
        wrapper={<div className="row half-margin-top" />}
      >
        <Wrapper
          condition={
            getIn(values, "drop-acct-session-time-type") === "specified"
          }
          wrapper={<div className="col" />}
        >
          <Field
            component={Select}
            name="drop-acct-session-time-type"
            id="drop-acct-session-time-type"
            title="Acct-Session-Time"
          >
            <option value="timeFromCreate">Seconds since creation</option>
            <option value="timeFromChange">Seconds since last change</option>
            <option value="specified">Specified</option>
          </Field>
        </Wrapper>
        <If
          condition={
            getIn(values, "drop-acct-session-time-type") === "specified"
          }
        >
          <div className="col">
            <Field
              name="session-time"
              id="session-time"
              component={Input}
              type="number"
              label="Seconds"
              min={0}
            />
          </div>
        </If>
      </Wrapper>
      <Field
        name="delay-time"
        id="delay-time"
        component={Input}
        type="number"
        label="Acct-Delay-Time"
        min={0}
      />
      <If condition={Array.isArray(selected) && selected.length === 1}>
        <Field
          name="framed-ip-address"
          id="framed-ip-address"
          component={Input}
          label="Framed-IP-Address"
        />
      </If>
      <Field name="keep-session" id="keep-session" component={Checkbox}>
        Keep sessions in DB
      </Field>
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

const DropBody = ({ selected }) => {
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

DropBody.propTypes = {
  selected: selectedType.isRequired,
};

const DropHeader = ({ selected }) => {
  const { toUpdate } = React.useContext(AccountingContext);

  if (typeof toUpdate === "string" && /bulk:.*/.test(toUpdate))
    return <h2 className="modal__title">Drop all sessions</h2>;

  if (!selected) return <h2 className="modal__title">No sessions selected</h2>;

  if (selected.length === 1)
    return (
      <>
        <h2 className="modal__title">Drop the session</h2>
        <div className="subheader">
          {"MAC: "}
          <span className="text-normal">{selected[0].mac}</span>
        </div>
      </>
    );

  return (
    <h2 className="modal__title">
      {"Drop "}
      {selected.length}
      {" sessions"}
    </h2>
  );
};

DropHeader.propTypes = {
  selected: selectedType.isRequired,
};

export const dropMapping = {
  initials: (selected) => ({
    "terminate-cause": "6",
    "drop-acct-session-time-type": "timeFromCreate",
    "session-time": 0,
    "delay-time": 0,
    "keep-session": false,
    async: true,
    ...(Array.isArray(selected) && selected.length === 1
      ? {
          "acct-session-id": selected[0].sessid,
          "calling-station-id": selected[0].mac,
          "framed-ip-address": selected[0].ipAddr || "",
        }
      : {}),
  }),
  submitAction: dropSessions,
  body: DropBody,
  header: DropHeader,
  actionButton: (
    <Button color="danger" onClick={() => {}}>
      Drop
    </Button>
  ),
};
