import React from "react";

import { Spinner as Loader } from "react-cui-2.0";
import { Fade } from "animations";
import { DelayedHOC } from "my-utils";

import { ActionsContext } from "../contexts";

const DelayedStatus = ({ text, onDelay }) => (
  <DelayedHOC delay={300} onDelay={onDelay}>
    <div className="flex-shrink-1 flex-center">
      <span className="icon-check text-success qtr-margin-right" />
      {text}
    </div>
  </DelayedHOC>
);

export const JobOverlay = ({ show, type, jobRef, job }) => {
  const { unblockJob, jobRemoved } = React.useContext(ActionsContext);
  return (
    <Fade
      in={show}
      enter
      exit
      appear={false}
      unmountOnExit
      mountOnEnter
      endOpacity={0.8}
    >
      <div
        className="flex flex-center-horizontal flex-center-vertical"
        style={{
          position: "absolute",
          width: `${(jobRef.current ? jobRef.current.offsetWidth : 2) - 2}px`,
          height: `${(jobRef.current ? jobRef.current.offsetHeight : 2) - 2}px`,
          top: "1px",
          left: "1px",
          backgroundColor: "white",
          zIndex: 1050,
        }}
      >
        {type === "loading" ? (
          <Loader text="Loading, please wait..." />
        ) : type === "repeated" ? (
          <DelayedStatus
            text="Job repeated."
            onDelay={() => unblockJob(job.id)}
          />
        ) : type === "deleted" ? (
          <DelayedStatus
            text="Job deleted."
            onDelay={() => jobRemoved(job.id)}
          />
        ) : type === "stopped" ? (
          <DelayedStatus
            text="Job stopped."
            onDelay={() => unblockJob(job.id)}
          />
        ) : null}
      </div>
    </Fade>
  );
};
