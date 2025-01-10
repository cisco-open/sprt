import React, { useContext } from "react";
import { Formik, Form, Field } from "formik";
import { SwitchTransition } from "react-transition-group";
import ip from "is-ip";
import merge from "deepmerge";

import { Input, Switch, Button, ConfirmationModal, toast } from "react-cui-2.0";

import { TabFade } from "animations";

import { ServerContext } from "../contexts";
import { saveServer, deleteServer } from "../actions";

import RadiusBlock from "./RadiusBlock";
import TacacsBlock from "./TacacsBlock";

const overwriteMerge = (_destinationArray, sourceArray) => sourceArray;

const emptyServer = {
  acct_port: 1813,
  address: "",
  auth_port: 1812,
  coa: 1,
  group: "",
  attributes: {
    coa_nak_err_cause: "503",
    dm_err_cause: "503",
    dns: "",
    friendly_name: "",
    no_session_action: "coa-nak",
    no_session_dm_action: "disconnect-nak",
    resolved: "",
    shared: "",
    v6_address: "",
    tacacs: false,
    tac: {
      ports: [49],
      shared: "",
    },
    radius: true,
  },
};

const Delete = ({ isSubmitting }) => {
  const { reload, updServer, ...server } = useContext(ServerContext);
  const [modal, setModal] = React.useState(false);

  return (
    <>
      <Button.Danger
        disabled={isSubmitting}
        onClick={() => setModal(true)}
        type="button"
      >
        Delete
      </Button.Danger>
      <ConfirmationModal
        isOpen={modal}
        prompt="Are you sure you want to delete the server?"
        confirmType="danger"
        confirmHandle={async () => {
          try {
            await deleteServer(server);
            setModal(false);
            updServer(null);
            reload();
            return true;
          } catch (e) {
            toast.error("Error", e.message, false);
            return false;
          }
        }}
        closeHandle={() => setModal(false)}
        confirmText="Delete"
      />
    </>
  );
};

const validate = (values) => {
  const errors = {};
  if (!values.address && !values.attributes.v6_address) {
    errors.address = "At least one address must be specified";
    errors.attributes = {
      ...(errors.attributes || {}),
      ...{ v6_address: "At least one address must be specified" },
    };
  }

  return errors;
};

export const ServerTabContent = () => {
  const { reload, updServer, ...server } = useContext(ServerContext);
  if (!server.id) return null;

  if (server.attributes && typeof server.attributes.radius === "undefined")
    server.attributes.radius = true;

  if (server.attributes && server.attributes.v6_address === null)
    server.attributes.v6_address = "";

  const submit = async (values, { setSubmitting }) => {
    try {
      if (typeof values.attributes.radius === "undefined")
        values.attributes.radius = false;
      if (typeof values.attributes.tacacs === "undefined")
        values.attributes.tacacs = false;
      if (typeof values.coa === "undefined") values.coa = 0;

      const { id } = await saveServer(values);

      toast.success("", "Saved");
      reload();
      if (id) updServer(id.toLowerCase());
    } catch (e) {
      toast.error("Error", e.message, false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tab-pane show">
      <SwitchTransition>
        <TabFade key={server.id}>
          <div className="panel no-padding no-margin-top base-margin-bottom tab-body">
            <Formik
              initialValues={merge(emptyServer, server, {
                arrayMerge: overwriteMerge,
              })}
              validate={validate}
              onSubmit={submit}
            >
              {({ isSubmitting }) => (
                <Form>
                  <div className="row">
                    <div className="col-4">
                      <h2 className="display-3 no-margin half-margin-bottom text-capitalize">
                        General
                      </h2>
                      <Field
                        component={Input}
                        type="text"
                        name="attributes.friendly_name"
                        label="Friendly name"
                      />
                      <Field
                        component={Input}
                        type="text"
                        name="address"
                        label="IPv4 address"
                        validate={(v) => {
                          if (v && !ip.v4(v)) return "Incorrect IPv4 address";
                          return undefined;
                        }}
                      />
                      <Field
                        component={Input}
                        type="text"
                        name="attributes.v6_address"
                        label="IPv6 address"
                        validate={(v) => {
                          if (v && !ip.v6(v)) return "Incorrect IPv6 address";
                          return undefined;
                        }}
                      />
                      <Field
                        component={Input}
                        type="text"
                        name="attributes.dns"
                        label="DNS server (IP address)"
                        validate={(v) => {
                          if (v && !ip(v))
                            return "Incorrect address format (neither IPv4 nor IPv6)";
                          return undefined;
                        }}
                      />
                      <Field
                        component={Input}
                        type="text"
                        name="group"
                        label="Group"
                      />
                    </div>
                    <div className="col-8">
                      <h2 className="display-3 no-margin half-margin-bottom text-capitalize">
                        Services
                      </h2>
                      <Field
                        component={Switch}
                        name="attributes.radius"
                        right="RADIUS"
                      />
                      <RadiusBlock />
                      <Field
                        component={Switch}
                        name="attributes.tacacs"
                        right="TACACS+"
                      />
                      <TacacsBlock />
                    </div>
                  </div>
                  <div className="panel no-padding base-margin-top">
                    {server.id === "new" ? null : (
                      <Delete isSubmitting={isSubmitting} />
                    )}
                    <Button.Success type="submit" disabled={isSubmitting}>
                      Save
                      {isSubmitting ? (
                        <span className="icon-animation spin qtr-margin-left" />
                      ) : null}
                    </Button.Success>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </TabFade>
      </SwitchTransition>
    </div>
  );
};
