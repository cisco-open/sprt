/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-one-expression-per-line */
/* eslint-disable import/prefer-default-export */
import React from "react";
import { getIn } from "formik";

import {
  Panel,
  Progressbar,
  Accordion,
  AccordionElement,
  Label,
} from "react-cui-2.0";

import { ActionsContext } from "../contexts";

import { JobOverlay } from "./JobOverlay";
import { JobStats } from "./JobStats";

const SessionsCount = ({ attributes }) =>
  typeof attributes.count === "undefined" ? null : (
    <>
      <div className="text-small text-uppercase">Sessions:</div>
      <div className="half-margin-bottom session-counter">
        {attributes.count}{" "}
        {typeof attributes.succeeded !== "undefined" &&
        typeof attributes.failed !== "undefined" ? (
          <>
            (<span className="text-success">{attributes.succeeded}</span>
            {" / "}
            <span className="text-danger">{attributes.failed}</span>)
          </>
        ) : null}
      </div>
    </>
  );

const JobAction = ({ attributes }) =>
  typeof attributes.action === "undefined" ? null : (
    <>
      <div className="text-small text-uppercase">Action:</div>
      <div className="half-margin-bottom">
        <span className="text-capitalize">{attributes.action}</span>{" "}
        {attributes.action == "generate" ? (
          <span className="text-uppercase">({attributes.protocol})</span>
        ) : null}
      </div>
    </>
  );

const JobActions = ({ job }) => {
  const { repeatJobs, removeJobs, stopJobs } = React.useContext(ActionsContext);
  return (
    <>
      {job.running ? (
        <div>
          <a className="stop-job" onClick={() => stopJobs([job.id])}>
            <span
              className="icon-stop qtr-margin-right"
              title="Stop the job."
            />
            <div className="subtext">Stop</div>
          </a>
        </div>
      ) : null}
      {job.cli ? (
        <div>
          <a className="repeat-job" onClick={() => repeatJobs([job.id])}>
            <span className="icon-refresh qtr-margin-right" />
            <div className="subtext">Repeat</div>
          </a>
        </div>
      ) : null}
      <div>
        <a
          className={`remove-job${job.running ? " still-running" : ""}`}
          onClick={() => removeJobs([job.id])}
        >
          <span
            className="icon-trash qtr-margin-right"
            title="Remove the job."
          />
          <div className="subtext">Remove</div>
        </a>
      </div>
      <JobStats job={job} />
    </>
  );
};

export const JobCard = ({ job }) => {
  const jobRef = React.useRef();
  const { blockedJobs, watchJob, unwatchJob } = React.useContext(
    ActionsContext
  );

  React.useEffect(() => {
    return () => {
      if (job) unwatchJob(job.id);
    };
  }, []);

  React.useEffect(() => {
    if (!job) return;
    if (job.running) watchJob(job.id);
    else unwatchJob(job.id);
  }, [getIn(job, "running", false)]);

  if (!job) return null;

  const progressbar = {
    size: "default",
    percentage: job.percentage,
  };

  if (job.success) {
    progressbar.color = "success";
    progressbar.label = "Completed";
  } else if (job.fail) {
    progressbar.color = "danger";
    progressbar.label = "Failure";
  } else if (job.running) {
    progressbar.color = "info";
    progressbar.label = `${job.percentage}%`;
  }

  return (
    <div className="grid__item" style={{ position: "relative" }}>
      <Panel
        bordered
        id={job.id}
        ref={jobRef}
        className="half-margin hover-emboss--medium"
        padding="loose"
      >
        <div className="subtitle text-ellipsis text-wrap-normal">
          {job.owner.includes("__api") ? (
            <Label size="tiny" color="success" className="half-margin-right">
              api
            </Label>
          ) : null}
          {job.name}
        </div>
        <small>
          {"On "}
          {job.attributes_decoded.created_f}
        </small>
        <div className="section no-padding-bottom">
          <div className="half-margin-bottom">
            <Progressbar withLabel {...progressbar} />
          </div>
          <Accordion toggles>
            <AccordionElement defaultOpen={false} title="Details">
              {job.attributes_decoded.finished_f ? (
                <>
                  <div className="text-small text-uppercase">Finished:</div>
                  <div className="half-margin-bottom">
                    {job.attributes_decoded.finished_f} (
                    {`${
                      job.attributes_decoded.finished -
                      job.attributes_decoded.created
                    }s`}
                    )
                  </div>
                </>
              ) : null}
              {job.attributes_decoded.server ? (
                <>
                  <div className="text-small text-uppercase half-margin-top">
                    Server:
                  </div>
                  <div className="half-margin-bottom">
                    {job.attributes_decoded.server}
                  </div>
                </>
              ) : null}
              <SessionsCount attributes={job.attributes_decoded} />
              <JobAction attributes={job.attributes_decoded} />
            </AccordionElement>
          </Accordion>
        </div>
        <hr className="half-margin-top" />
        <div className="flex flex-between base-margin-top">
          <JobActions job={job} />
        </div>
      </Panel>
      <JobOverlay
        show={typeof blockedJobs[job.id] !== "undefined"}
        type={blockedJobs[job.id] || "loading"}
        jobRef={jobRef}
        job={job}
      />
    </div>
  );
};
