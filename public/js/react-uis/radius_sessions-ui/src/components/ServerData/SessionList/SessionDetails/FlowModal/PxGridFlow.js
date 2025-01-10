import React from "react";
import ReactJsonTree from "react-json-tree";
import PropTypes from "prop-types";
import { base16Theme } from "my-react-cui/base16Theme";
import { DateTime } from "luxon";

import { TimelineItem, Label } from "react-cui-2.0";

const PxGridMessage = ({ message: { timestamp, topic, message } }) => {
  const dt = React.useMemo(() => {
    if (/^\d+$/.test(timestamp)) return DateTime.fromMillis(timestamp);
    return DateTime.fromISO(timestamp);
  }, [timestamp]);

  return (
    <TimelineItem contentClassName="flex-fill" style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: "-9px" }}>
        <Label color="info" size="small" raised>
          {topic}
        </Label>
      </div>
      <div className="qtr-margin-top text-small">
        {`at ${dt.toFormat("HH:mm:ss.SSS dd/MM/yyyy")}`}
      </div>
      <div className="text-monospace">
        <ReactJsonTree
          data={{ message }}
          theme={{ ...base16Theme, base00: "var(--cui-background-inactive)" }}
          invertTheme={false}
          hideRoot
          shouldExpandNode={(_keyName, _data, level) => level <= 0}
        />
      </div>
    </TimelineItem>
  );
};

PxGridMessage.propTypes = {
  message: PropTypes.shape({
    timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
      .isRequired,
    topic: PropTypes.string.isRequired,
    message: PropTypes.any.isRequired,
  }).isRequired,
};

const PxGridFlow = ({ messages }) => (
  <div className="px-flow-container">
    {messages.map((m, idx) => (
      <PxGridMessage message={m} key={idx} />
    ))}
  </div>
);

PxGridFlow.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.any).isRequired,
};

export default PxGridFlow;
