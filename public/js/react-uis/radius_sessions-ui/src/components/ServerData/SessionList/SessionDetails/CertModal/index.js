import React from "react";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";
import loadable from "@loadable/component";

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

import { getCertificate } from "../../../../../actions";

const Body = loadable(() => import("./Body"), { fallback: <Loader /> });

export const certModalEvent = "session.show.cert";

export const CertModalListner = () => {
  const [data, setData] = React.useState(null);
  const [shown, setShown] = React.useState(false);
  const loadState = useAsync({
    deferFn: getCertificate,
    defer: true,
  });

  React.useEffect(() => {
    eventManager.on(certModalEvent, (certificate) =>
      setData({ certificate, type: "identity" })
    );
  }, []);

  React.useEffect(() => {
    if (data) setShown(true);
  }, [data]);

  React.useEffect(() => {
    if (shown) loadState.run(data);
  }, [shown]);

  const onClose = () => setShown(false);

  if (!data) return null;

  return (
    <Modal closeIcon closeHandle={onClose} size="large" isOpen={shown}>
      <ModalHeader>
        <h2 className="modal__title">Certificate details</h2>
      </ModalHeader>
      <ModalBody className={!loadState.isPending ? "text-left" : ""}>
        <IfPending state={loadState}>
          <Loader />
        </IfPending>
        <IfRejected state={loadState}>
          {(error) => (
            <Alert type="error" title="Operation failed">
              {"Couldn't get flow: "}
              {error.message}
              <ErrorDetails error={error} />
            </Alert>
          )}
        </IfRejected>
        <IfFulfilled state={loadState}>
          {({ result }) => <Body chain={result} />}
        </IfFulfilled>
      </ModalBody>
      <ModalFooter>
        <Button.Light onClick={onClose}>OK</Button.Light>
      </ModalFooter>
    </Modal>
  );
};
