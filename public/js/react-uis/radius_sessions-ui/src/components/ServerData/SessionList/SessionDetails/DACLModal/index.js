import React from "react";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";

import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Alert,
  Spinner as Loader,
  Button,
} from "react-cui-2.0";

import { ErrorDetails } from "my-utils";
import { eventManager } from "my-utils/eventManager";

import { getSessionDacl } from "../../../../../actions";

const Body = ({ dacl }) => {
  if (!dacl || !Array.isArray(dacl) || !dacl.length)
    return <Alert.Info>dACL is empty.</Alert.Info>;

  return (
    <pre className="numbered">
      <span className="line-number text-muted text-monospace">
        {dacl.map((_, i) => (
          <span key={i}>{i}</span>
        ))}
      </span>
      <code className="text-monospace">{dacl.map((line) => `${line}\n`)}</code>
    </pre>
  );
};

export const daclModalEvent = "session.show.dacl";

export const DACLModalListner = () => {
  const [data, setData] = React.useState(null);
  const [ep, setEp] = React.useState({});
  const [shown, setShown] = React.useState(false);
  const flowLoadState = useAsync({
    deferFn: getSessionDacl,
    defer: true,
  });

  React.useEffect(() => {
    eventManager.on(daclModalEvent, (server, bulk, id, newEp) => {
      setData({ server, bulk, id });
      setEp(newEp);
    });
  }, []);

  React.useEffect(() => {
    if (data) setShown(true);
  }, [data]);

  React.useEffect(() => {
    if (shown) flowLoadState.run(data);
  }, [shown]);

  const onClose = () => setShown(false);

  if (!data) return null;

  return (
    <Modal closeIcon closeHandle={onClose} size="large" isOpen={shown}>
      <ModalHeader>
        <h2 className="modal__title">Session dACL</h2>
        {flowLoadState.isFulfilled ? (
          <div className="subheader">
            {"Endpoint: "}
            <span className="text-normal">{ep.mac}</span>
          </div>
        ) : null}
      </ModalHeader>
      <ModalBody className={!flowLoadState.isPending ? "text-left" : ""}>
        <IfPending state={flowLoadState}>
          <Loader />
        </IfPending>
        <IfRejected state={flowLoadState}>
          {(error) => (
            <Alert type="error" title="Operation failed">
              {"Couldn't get flow: "}
              {error.message}
              <ErrorDetails error={error} />
            </Alert>
          )}
        </IfRejected>
        <IfFulfilled state={flowLoadState}>
          {({ dacl }) => <Body dacl={dacl} />}
        </IfFulfilled>
      </ModalBody>
      <ModalFooter>
        <Button.Light onClick={onClose}>OK</Button.Light>
      </ModalFooter>
    </Modal>
  );
};
