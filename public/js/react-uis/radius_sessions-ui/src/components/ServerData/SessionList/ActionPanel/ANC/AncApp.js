import React from "react";
import { Formik, Form, Field } from "formik";

import { toast, Spinner as Loader, Alert } from "react-cui-2.0";

import { fetchConnections } from "./anc_actions";

import {
  ConnectionsContext,
  SessionContext,
  MethodsContext,
  BlockerContext,
} from "./anc_contexts";

import { GetEndpointByMac } from "./anc_comps/GetEndpointByMac";
import { ApplyEndpoint } from "./anc_comps/ApplyEndpoint";
import { ClearEndpoint } from "./anc_comps/ClearEndpoint";
import { ConnectionSelector } from "./anc_comps/ConnectionSelector";

const dispatcher = {
  getEndpointByMac: (props) => <GetEndpointByMac {...props} />,
  applyEndpointByIp: (props) => <ApplyEndpoint by="ip" {...props} />,
  applyEndpointByMac: (props) => <ApplyEndpoint by="mac" {...props} />,
  clearEndpointByIp: (props) => <ClearEndpoint by="ip" {...props} />,
  clearEndpointByMac: (props) => <ClearEndpoint by="mac" {...props} />,
};

const ANCForm = ({ api }) => {
  if (!api) return null;

  return (
    <Formik
      initialValues={{ connection: "" }}
      onSubmit={(_values, { setSubmitting }) => {
        setSubmitting(false);
      }}
    >
      {(formik) => (
        <Form>
          <Field component={ConnectionSelector} name="connection" />
          {dispatcher[api]({ formik })}
        </Form>
      )}
    </Formik>
  );
};

const AncApp = ({ session, api }) => {
  const [connections, setConnections] = React.useState(null);
  const [blocked, setBlocked] = React.useState(false);

  React.useEffect(() => {
    fetchConnections()
      .then((newConnections) =>
        setConnections(
          newConnections.filter((c) => c.id !== "__new-connection")
        )
      )
      .catch((err) => {
        toast.error("Error", err.message, false);
        console.error(err);
      });
  }, []);

  let element;
  if (Array.isArray(connections) && connections.length) {
    element = <ANCForm api={api} />;
  } else if (Array.isArray(connections) && !connections.length) {
    element = (
      <Alert title="No pxGrid connections">
        {"No pxGrid connections found. Please create a connection on a "}
        <a href="/pxgrid/">pxGrid</a>
        {" page first."}
      </Alert>
    );
  } else {
    element = <Loader />;
  }

  return (
    <MethodsContext.Provider value={{ setBlocked }}>
      <BlockerContext.Provider value={blocked}>
        <SessionContext.Provider value={session}>
          <ConnectionsContext.Provider value={connections}>
            {element}
          </ConnectionsContext.Provider>
        </SessionContext.Provider>
      </BlockerContext.Provider>
    </MethodsContext.Provider>
  );
};

export default AncApp;
