import React from "react";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";
import { getIn } from "formik";

import {
  Modal,
  ModalBody,
  ModalFooter,
  Alert,
  Spinner as Loader,
  Button,
  Icon,
  Accordion,
  AccordionElement,
  Timeline,
  TimelineItem,
} from "react-cui-2.0";
import { DiffLabel } from "my-composed/DiffLabel";

import { ErrorDetails } from "my-utils";

import { BulkContext } from "../../contexts";
import { getSessionFlow } from "../../actions";

const packetType = (packet) => {
  if (getIn(packet, "radius.code", "UNKNOWN") === "ERROR") return "danger";

  if (packet.packet_type === 1) return "dark";

  const status = getIn(packet, "radius.packet.body.status", "UNKNOWN");

  if (
    [
      "TAC_PLUS_AUTHEN_STATUS_PASS",
      "TAC_PLUS_ACCT_STATUS_SUCCESS",
      "TAC_PLUS_AUTHOR_STATUS_PASS_ADD",
      "TAC_PLUS_AUTHOR_STATUS_PASS_REPL",
    ].includes(status)
  )
    return "success";

  if (
    [
      "TAC_PLUS_AUTHOR_STATUS_FAIL",
      "TAC_PLUS_AUTHOR_STATUS_ERROR",
      "TAC_PLUS_AUTHOR_STATUS_FOLLOW",
      "TAC_PLUS_AUTHEN_STATUS_FAIL",
      "TAC_PLUS_AUTHEN_STATUS_RESTART",
      "TAC_PLUS_AUTHEN_STATUS_ERROR",
      "TAC_PLUS_AUTHEN_STATUS_FOLLOW",
      "TAC_PLUS_ACCT_STATUS_ERROR",
      "TAC_PLUS_ACCT_STATUS_FOLLOW",
    ].includes(status)
  )
    return "danger";

  if (
    [
      "TAC_PLUS_AUTHEN_STATUS_GETDATA",
      "TAC_PLUS_AUTHEN_STATUS_GETUSER",
      "TAC_PLUS_AUTHEN_STATUS_GETPASS",
    ].includes(status)
  )
    return "secondary";

  return "info";
};

const PacketIcon = ({ packet }) => (
  <Button circle color={packetType(packet)}>
    <Icon
      icon={packet.packet_type === 1 ? "arrow-left-tail" : "arrow-right-tail"}
    />
  </Button>
);

const PacketAttributes = ({ body }) => {
  if (!Object.keys(body).length) return null;

  return (
    <Accordion toggles>
      <AccordionElement defaultOpen={false} title="Details">
        <table className="table table--compressed table--bordered table--hover">
          <thead>
            <tr>
              <th>Attribute</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(body)
              .sort()
              .map((k) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>
                    {Array.isArray(body[k])
                      ? body[k].map((v, i) => <div key={i}>{v}</div>)
                      : body[k]}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </AccordionElement>
    </Accordion>
  );
};

const PacketError = ({ packet }) => {
  if (getIn(packet, "radius.code", "UNKNOWN") !== "ERROR") return null;

  return <Alert.Error>{packet.radius.message}</Alert.Error>;
};

const Packet = ({ packet, prevTime }) => {
  const type = packetType(packet);

  return (
    <TimelineItem
      icon={<PacketIcon packet={packet} />}
      style={{ position: "relative" }}
      contentClassName="flex-fill"
    >
      <DiffLabel curr={packet.radius.time} prev={prevTime} />
      <div>
        <span className={`text-bold text-${type}`}>
          {getIn(
            packet,
            "radius.packet.body.status",
            getIn(packet, "radius.code", "UNKNOWN")
          )}
        </span>
        <span>{` at ${packet.radius.formattedDateTime}`}</span>
      </div>
      <div className="responsive-table">
        <PacketAttributes body={getIn(packet, "radius.packet.body", {})} />
        <PacketError packet={packet} />
      </div>
    </TimelineItem>
  );
};

const Flow = ({ packets }) => {
  const f = React.useMemo(
    () =>
      packets.map((p) => ({
        ...p,
        radius: { ...p.radius, time: p.radius.time * 1000 },
      })),
    [packets]
  );

  return (
    <Timeline>
      {f.map((p, idx) => (
        <Packet
          key={p.order}
          packet={p}
          prevTime={idx > 0 ? f[idx - 1].radius.time : -1}
        />
      ))}
    </Timeline>
  );
};
export const SessionDetails = ({ session }) => {
  const [modal, setModal] = React.useState(false);
  const { server, ...bulk } = React.useContext(BulkContext);

  const flowLoadState = useAsync({
    deferFn: getSessionFlow,
    defer: true,
    server,
    id: session.id,
    bulk: bulk.name,
  });

  return (
    <>
      <a
        onClick={() => {
          flowLoadState.run();
          setModal(true);
        }}
      >
        <span className="icon-diagnostics" title="Session flow" />
      </a>
      <Modal
        closeIcon
        closeHandle={() => setModal(false)}
        size="large"
        isOpen={modal}
        title="Session flow"
      >
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
            {({ sessions }) => {
              if (
                !Array.isArray(sessions) ||
                !sessions.length ||
                Array.isArray(!sessions[0].flow) ||
                !sessions[0].flow.length
              )
                return (
                  <Alert type="warning" title="Flow is empty">
                    No packets saved for the flow
                  </Alert>
                );

              return <Flow packets={sessions[0].flow} />;
            }}
          </IfFulfilled>
        </ModalBody>
        <ModalFooter>
          <Button.Light onClick={() => setModal(false)}>OK</Button.Light>
        </ModalFooter>
      </Modal>
    </>
  );
};
