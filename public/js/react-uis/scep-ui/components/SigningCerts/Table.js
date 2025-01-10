import React from "react";
import PropTypes from "prop-types";

import { Checkbox, Spinner as Loader, Alert } from "react-cui-2.0";

import { SelectionCheckbox } from "../general/SelectionCheckbox";
import { SigningCertsContext } from "../../contexts";

const TableHead = () => (
  <SigningCertsContext.Consumer>
    {({ selectAll, clearSelection, signers, selected }) => (
      <thead>
        <tr>
          <th className="checkbox-only">
            <Checkbox
              field={{
                onChange: (e) =>
                  e.target.checked ? selectAll() : clearSelection(),
                name: "scep-signers-all",
              }}
              form={{
                touched: {},
                error: {},
                values: {
                  "scep-signers-all": !signers.filter(
                    (s) => !selected.includes(s.id)
                  ).length,
                },
              }}
            />
          </th>
          <th>Friendly Name</th>
          <th>Subject</th>
          <th>Valid from</th>
          <th>Valid till</th>
        </tr>
      </thead>
    )}
  </SigningCertsContext.Consumer>
);

const SignersTable = ({ state }) => {
  const { signers, select, deselect, selected } = React.useContext(
    SigningCertsContext
  );

  if (state.isLoading)
    return (
      <div className="flex-center base-margin-top dbl-margin-bottom">
        <Loader />
      </div>
    );

  if (state.isRejected)
    return (
      <div className="flex-center base-margin-top dbl-margin-bottom">
        <Alert.Error>Something went wrong.</Alert.Error>
      </div>
    );

  if (!Array.isArray(signers) || !signers.length)
    return (
      <div className="flex-center base-margin-top dbl-margin-bottom">
        No signing certificates found.
      </div>
    );

  return (
    <div className="responsive-table base-margin-top dbl-margin-bottom">
      <table className="table table--compressed table--bordered table--highlight table--nostripes table--wrap table--sortable">
        <TableHead />
        <tbody>
          {signers.map((signer) => (
            <tr key={signer.id}>
              <td>
                <SelectionCheckbox
                  id={signer.id}
                  selected={selected}
                  select={select}
                  deselect={deselect}
                />
              </td>
              <td>{signer.friendly_name}</td>
              <td>{signer.subject}</td>
              <td>{signer.not_before}</td>
              <td>{signer.not_after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

SignersTable.propTypes = {
  state: PropTypes.shape({
    isLoading: PropTypes.bool,
    isResolved: PropTypes.bool,
    isRejected: PropTypes.bool,
  }).isRequired,
};

SignersTable.defaultProps = {};

export default SignersTable;
