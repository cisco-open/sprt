/* eslint-disable import/prefer-default-export */
import React from "react";

import { useAsync } from "react-async";
import loadable from "@loadable/component";

import {
  Modal,
  ModalBody,
  ModalFooter,
  Button,
  Spinner as Loader,
} from "react-cui-2.0";

import AlertErrorBoundary from "my-composed/AlertErrorBoundary";

import { getStats } from "../actions";

const LoadableCharts = loadable(() => import("./JobCharts"), {
  fallback: <Loader />,
});

export const JobStats = ({ job }) => {
  const [modal, setModal] = React.useState(false);

  const statsLoading = useAsync({
    deferFn: getStats,
    defer: true,
    user: job.owner,
  });

  return job.attributes_decoded.stats ? (
    <>
      <div>
        <a
          className="job-stats"
          onClick={() => {
            statsLoading.run(job.id);
            setModal(true);
          }}
        >
          <span
            className="icon-analysis qtr-margin-right"
            title="Show charts"
          />
          <div className="subtext">Charts</div>
        </a>
      </div>
      <Modal
        closeIcon
        closeHandle={() => setModal(false)}
        size="full"
        isOpen={modal}
        title="Charts"
      >
        <ModalBody className="text-left">
          <AlertErrorBoundary>
            <LoadableCharts job={job} statsLoading={statsLoading} />
          </AlertErrorBoundary>
        </ModalBody>
        <ModalFooter>
          <Button.Light onClick={() => setModal(false)}>OK</Button.Light>
        </ModalFooter>
      </Modal>
    </>
  ) : null;
};
