import React from "react";
import PropTypes from "prop-types";

import { Tab, Tabs, Alert, Timeline } from "react-cui-2.0";

import PxGridFlow from "./PxGridFlow";
import RadiusPacket from "./RadiusPacket";

const tabNames = {
  "radius-auth": "Authentication",
  "radius-acct": "Accounting",
  "radius-coa": "CoA",
  "radius-disconnect": "Disconnect",
  http: "HTTP",
  "out-of-order": "Out of Order",
  pxgrid: "pxGrid",
};

const RadiusFlow = ({ packets }) => {
  return (
    <Timeline>
      {packets.map((p, idx) => (
        <RadiusPacket
          packet={p}
          key={p.order}
          prevTime={idx > 0 ? packets[idx - 1].radius.time : -1}
        />
      ))}
    </Timeline>
  );
};

RadiusFlow.propTypes = {
  packets: PropTypes.arrayOf(PropTypes.any).isRequired,
};

const formatRadius = (radius) => ({
  ...radius,
  code: radius.Code || radius.code,
  time: (radius.Timestamp || radius.time) * 1000,
});

const FlowModalBody = ({ session }) => {
  const flows = React.useMemo(() => {
    if (!session || !Array.isArray(session.flows) || !session.flows.length)
      return null;
    return session.flows.map(({ type, packets, ...flowRest }) => ({
      type,
      ...flowRest,
      ...(packets
        ? {
            packets: packets.map(({ radius, ...packetRest }) => ({
              ...packetRest,
              radius: formatRadius(
                typeof radius === "string" ? JSON.parse(radius) : radius
              ),
            })),
          }
        : {}),
    }));
  }, [session]);

  if (!flows)
    return (
      <Alert.Warning title="Flow is empty">
        No packets saved for the flow
      </Alert.Warning>
    );

  return (
    <Tabs vertical defaultTab="flow-0">
      {flows.map((f, idx) => (
        <Tab key={idx} id={`flow-${idx}`} title={tabNames[f.type] || f.type}>
          {f.type === "pxgrid" ? (
            <div className="timeline timeline--block">
              <div className="timeline__list">
                <PxGridFlow messages={f.messages} />
              </div>
            </div>
          ) : (
            <RadiusFlow packets={f.packets} />
          )}
        </Tab>
      ))}
    </Tabs>
  );
};

FlowModalBody.propTypes = {
  session: PropTypes.shape({ flows: PropTypes.array }).isRequired,
};

FlowModalBody.defaultProps = {};

export default FlowModalBody;
