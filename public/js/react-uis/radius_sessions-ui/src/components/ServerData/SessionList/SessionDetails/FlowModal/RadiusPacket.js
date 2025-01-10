import React from "react";
import PropTypes from "prop-types";
import { DateTime } from "luxon";

import {
  TimelineItem,
  Icon,
  Button,
  Accordion,
  AccordionElement,
} from "react-cui-2.0";
import { DiffLabel } from "my-composed/DiffLabel";

const rawPackets = [
  "HTTP_REQUEST",
  "HTTP_RESPONSE",
  "GUEST_SUCCESS",
  "GUEST_FAILURE",
  "GUEST_REGISTERED",
];

const VSA = ({ vsa }) => (
  <dl className="dl--inline-centered">
    {vsa.Nested.map((e, idx) => (
      <React.Fragment key={idx}>
        <dt>{e.Name}</dt>
        <dd>{e.Value}</dd>
      </React.Fragment>
    ))}
  </dl>
);

VSA.propTypes = {
  vsa: PropTypes.shape({
    Nested: PropTypes.arrayOf(
      PropTypes.shape({ Name: PropTypes.any, Value: PropTypes.any })
    ),
  }).isRequired,
};

const valueFormatter = (attribute) => {
  switch (attribute.name) {
    case "Message-Authenticator":
    case "CHAP-Password":
      return <pre>{attribute.value.hexEncode().join(" ")}</pre>;
    case "EAP-Message":
    case "MS-MPPE-Recv-Key":
    case "MS-MPPE-Send-Key":
      return <pre>{attribute.value.hexDump()}</pre>;
    case "Vendor-Specific":
      return <VSA vsa={attribute} />;
    default:
      return attribute.value;
  }
};

const RadiusAttribute = ({ attribute }) => (
  <tr>
    <td style={{ whiteSpace: "nowrap" }}>
      {attribute.name}
      {attribute.name === "Vendor-Specific" ? (
        <>
          <br />
          {attribute.Vendor}
        </>
      ) : null}
    </td>
    <td style={{ whiteSpace: "normal", wordBreak: "break-all" }}>
      {valueFormatter(attribute)}
    </td>
  </tr>
);

RadiusAttribute.propTypes = {
  attribute: PropTypes.shape({
    name: PropTypes.any,
    Vendor: PropTypes.any,
  }).isRequired,
};

const Attributes = ({ packet }) =>
  !packet || !packet.length ? null : (
    <table className="table table--compressed table--bordered table--hover">
      <thead>
        <tr>
          <th>Attribute</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {packet
          .map((a) => ({
            ...a,
            name: a.name || a.Name,
            value: a.value || a.Value,
          }))
          .map((attribute, idx) => (
            <RadiusAttribute attribute={attribute} key={idx} />
          ))}
      </tbody>
    </table>
  );

Attributes.propTypes = {
  packet: PropTypes.arrayOf(PropTypes.any).isRequired,
};

const PacketIcon = ({ type, code }) => {
  const { color, icon } = React.useMemo(() => {
    if (type === 1) return { color: "dark", icon: "arrow-left-tail" };

    switch (code) {
      case "ACCESS_ACCEPT":
      case "ACCOUNTING_RESPONSE":
      case "GUEST_SUCCESS":
      case "GUEST_REGISTERED":
        return { color: "success", icon: "arrow-right-tail" };
      case "ACCESS_CHALLENGE":
      case "HTTP_RESPONSE":
        return { color: "secondary", icon: "arrow-right-tail" };
      case "COA_REQUEST":
      case "DISCONNECT_REQUEST":
        return { color: "secondary", icon: "arrow-right-tail" };
      default:
        return { color: "danger", icon: "error-outline" };
    }
  }, [type, code]);

  return (
    <Button circle color={color}>
      <Icon icon={icon} />
    </Button>
  );
};

PacketIcon.propTypes = {
  type: PropTypes.number.isRequired,
  code: PropTypes.string.isRequired,
};

const RadiusPacket = ({ packet: { packet_type: type, radius }, prevTime }) => {
  const labelClass = React.useMemo(() => {
    if (type === 1) return "-tertiary";

    switch (radius.code) {
      case "ACCESS_ACCEPT":
      case "ACCOUNTING_RESPONSE":
      case "COA_REQUEST":
      case "GUEST_SUCCESS":
      case "GUEST_REGISTERED":
        return "-success";
      case "ACCESS_CHALLENGE":
      case "HTTP_RESPONSE":
        return "-info";
      case "DISCONNECT_REQUEST":
        return "-warning";
      default:
        return "-danger";
    }
  }, [type, radius]);

  return (
    <TimelineItem
      icon={<PacketIcon code={radius.code} type={type} />}
      style={{ position: "relative" }}
      contentClassName="flex-fill"
    >
      <DiffLabel curr={radius.time} prev={prevTime} />
      <div className="flex">
        <div className="flex-fluid dbl-margin-right">
          <span className={`text-bold text${labelClass}`}>{radius.code}</span>
          <span>
            {` at ${DateTime.fromMillis(radius.time).toFormat(
              "HH:mm:ss.SSS dd/MM/yyyy"
            )}`}
          </span>
        </div>
        {radius.server ? (
          <div>
            {type === 1 ? "To: " : "From: "}
            {radius.server.address}
          </div>
        ) : null}
      </div>
      <Accordion toggles>
        <AccordionElement title="Packet body">
          <div className="responsive-table">
            {rawPackets.includes(radius.code) ? (
              <pre
                className="half-margin-top"
                style={{ wordBreak: "break-all" }}
              >
                {radius.packet[0].value}
              </pre>
            ) : (
              <Attributes packet={radius.packet} />
            )}
          </div>
        </AccordionElement>
      </Accordion>
    </TimelineItem>
  );
};

RadiusPacket.propTypes = {
  packet: PropTypes.shape({
    radius: PropTypes.any,
    packet_type: PropTypes.number,
  }).isRequired,
  prevTime: PropTypes.number.isRequired,
};

export default RadiusPacket;
