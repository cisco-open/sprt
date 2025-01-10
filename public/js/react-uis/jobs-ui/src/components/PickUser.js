import React from "react";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";

import {
  Modal,
  ModalBody,
  ModalFooter,
  Spinner as Loader,
  Alert,
  Button,
  Input,
} from "react-cui-2.0";

import { ErrorDetails } from "my-utils";

import { getUsers } from "../actions";

const OwnersList = ({ owners, selectUser }) => {
  const [filter, setFilter] = React.useState("");

  return (
    <>
      <Input
        type="search"
        name="filter"
        placeholder="Filter"
        icon="search"
        iconClick={() => {}}
        field={{
          onChange: (e) => setFilter(e.target.value),
          value: filter,
          name: "filter",
        }}
        form={{
          touched: {},
          errors: {},
        }}
      />
      <hr />
      <ul className="list list--highlight no-margin-top no-padding-left">
        {owners
          .filter((o) => (filter ? o.includes(filter) : true))
          .map((o) => (
            <li key={o}>
              <a onClick={() => selectUser(o)}>{o}</a>
            </li>
          ))}
      </ul>
    </>
  );
};

export const PickUser = ({ user, selectUser }) => {
  const [modal, setModal] = React.useState(false);

  const loadingState = useAsync({
    deferFn: getUsers,
  });

  const openModal = () => {
    loadingState.run();
    setModal(true);
  };

  return (
    <>
      <div className="base-margin-bottom">
        {"Showing jobs of "}
        <span className="text-indigo">{user}</span>
        {" ("}
        <a onClick={openModal}>change</a>)
      </div>
      <Modal
        closeIcon
        closeHandle={() => setModal(false)}
        size="small"
        isOpen={modal}
        title="Users with jobs"
      >
        <ModalBody className="text-left">
          <IfPending state={loadingState}>
            <Loader />
          </IfPending>
          <IfRejected state={loadingState}>
            {(error) => (
              <Alert type="error" title="Operation failed">
                {"Couldn't get jobs data: "}
                {error.message}
                <ErrorDetails error={error} />
              </Alert>
            )}
          </IfRejected>
          <IfFulfilled state={loadingState}>
            {(data) => {
              if (!data.owners || !data.owners.length) return null;

              return (
                <OwnersList
                  owners={data.owners}
                  selectUser={(usr) => {
                    setModal(false);
                    selectUser(usr);
                  }}
                />
              );
            }}
          </IfFulfilled>
        </ModalBody>
        <ModalFooter>
          <Button.Light onClick={() => setModal(false)}>Close</Button.Light>
        </ModalFooter>
      </Modal>
    </>
  );
};
