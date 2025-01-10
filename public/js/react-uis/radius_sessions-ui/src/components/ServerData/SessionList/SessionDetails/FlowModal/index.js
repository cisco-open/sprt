import React from "react";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";
import loadable from "@loadable/component";
import { useRouteMatch, useHistory, useParams } from "react-router-dom";
import { getIn } from "formik";

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

import { getSessionFlow } from "../../../../../actions";

const Body = loadable(() => import("./Body"), { fallback: <Loader /> });

export const flowModalEvent = "session.show.flow";

export const FlowModalListner = () => {
  const flowLoadState = useAsync({
    deferFn: getSessionFlow,
    defer: true,
  });

  const { server, bulk } = useParams();
  const { path, url } = useRouteMatch();
  const match = useRouteMatch({
    path: `${path}session-flow/:id(\\d+)/`,
    strict: true,
  });
  const history = useHistory();
  const id = React.useMemo(() => (match ? match.params.id : null), [match]);

  React.useEffect(() => {
    if (id) flowLoadState.run({ server, bulk, id });
  }, [id, server, bulk]);

  const onClose = () => history.push(url);

  return (
    <Modal closeIcon closeHandle={onClose} size="full" isOpen={Boolean(match)}>
      <ModalHeader>
        <h2 className="modal__title">Session flow</h2>
        {flowLoadState.isFulfilled &&
        getIn(flowLoadState.data, "session.mac") ? (
          <div className="subheader">
            {"Endpoint: "}
            <span className="text-normal">
              {flowLoadState.data.session.mac}
            </span>
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
          {({ session }) => <Body session={session} />}
        </IfFulfilled>
      </ModalBody>
      <ModalFooter>
        <Button.Light onClick={onClose}>OK</Button.Light>
      </ModalFooter>
    </Modal>
  );
};
