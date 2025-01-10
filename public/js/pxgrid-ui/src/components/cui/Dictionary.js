import React from "react";
import PropTypes from "prop-types";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";
import { connect, Field, getIn } from "formik";

import { InputHelpBlock } from "./InputHelpBlock";
import { Loader } from "./Loader";
import { Alert } from "./Alert";
import { Label } from "./Label";
import { Switch } from "./SwitchFormik";
import { Radios } from "./RadioFormik";
import { Button } from "./Button";
import { Modal, ModalBody, ModalFooter } from "./Modal";

const SelectedContext = React.createContext([]);
const VarPrefix = React.createContext("");

const DictionaryDrawer = ({ label, dictionaries, open, updateVar }) => {
  const [openState, setOpen] = React.useState(open);
  const selected = React.useContext(SelectedContext);

  return (
    <div className={"drawer" + (openState ? " drawer--opened" : "")}>
      <h5 className="half-margin-bottom drawer__header">
        <a onClick={() => setOpen(prev => !prev)}>{label}</a>
      </h5>
      <div className="drawer__body animated faster fadeIn">
        <div className="responsive-table dbl-margin-bottom">
          <table className="table">
            <tbody>
              {dictionaries.map(dict => (
                <tr key={dict.id}>
                  <td>
                    <label className="checkbox">
                      <input
                        className="dictionary"
                        type="checkbox"
                        onChange={e => updateVar(dict, e.target.checked)}
                        onBlur={e => updateVar(dict, e.target.checked)}
                        checked={
                          selected.findIndex(d => d.id === dict.id) >= 0
                            ? "checked"
                            : false
                        }
                      />
                      <span className="checkbox__input" />
                      <span className="checkbox__label hidden-xs">
                        {dict.name}
                      </span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const BodyWithData = ({ data, ...rest }) => {
  const varPrefix = React.useContext(VarPrefix);

  if (!data.result || !Object.keys(data.result))
    return (
      <Alert type="info" title="No dictionaries">
        No dictionaries yet.{" "}
        <a href={globals.rest.dictionaries.new} target="_blank">
          Create one.
          <span className="icon-jump-out qtr-margin-left" />
        </a>
      </Alert>
    );

  return (
    <>
      {Object.keys(data.result)
        .filter(k => k !== "labels")
        .map((key, idx) => (
          <DictionaryDrawer
            key={key}
            dictionaries={data.result[key]}
            label={data.result.labels[key]}
            open={idx === 0}
            {...rest}
          />
        ))}
      <div className="flex flex-center-vertical dbl-margin-top">
        <div className="base-margin-right">How to select values</div>
        <Radios
          inline
          values={[
            { value: "random", label: "Select randomly" },
            { value: "one-by-one", label: "Select in order" }
          ]}
          name={`${varPrefix}.how_to_follow`}
        />
      </div>
      <Field
        component={Switch}
        className="half-margin-top"
        name={`${varPrefix}.disallow_repeats`}
        right="Disallow reuse of values"
      />
    </>
  );
};

const EditDictionary = connect(
  ({
    types,
    loadDictionaries,
    handleClose,
    fieldName,
    isOpen,
    formik: { values, setFieldValue }
  }) => {
    const loadingState = useAsync({
      promiseFn: loadDictionaries,
      types
    });

    React.useEffect(() => {
      if (isOpen) loadingState.reload();
      else if (loadingState === "pending") loadingState.cancel();
    }, [isOpen]);

    const [selected, setSelected] = React.useState(
      getIn(values, fieldName, [])
    );

    const updateVar = (dictionary, checked) => {
      const idx = selected.findIndex(d => d.id === dictionary.id);
      if (!checked && idx >= 0)
        setSelected([...selected.slice(0, idx), ...selected.slice(idx + 1)]);
      if (checked && idx < 0) setSelected([...selected, dictionary]);
    };

    const saveData = () => {
      setFieldValue(fieldName, [...selected]);
      handleClose();
    };

    return (
      <Modal
        title="Select Dictionaries"
        size="large"
        closeIcon
        closeHandle={handleClose}
        autoClose={true}
        isOpen={isOpen}
      >
        <ModalBody className="text-left">
          <IfPending state={loadingState}>
            <Loader text="Fetching data..." />
          </IfPending>
          <IfRejected state={loadingState}>
            {error => (
              <Alert type="error" title="Operation failed">
                Couldn't get TACACS+ options: {error.message}
              </Alert>
            )}
          </IfRejected>
          <IfFulfilled state={loadingState}>
            {data => (
              <SelectedContext.Provider value={selected}>
                <BodyWithData data={data} updateVar={updateVar} />
              </SelectedContext.Provider>
            )}
          </IfFulfilled>
        </ModalBody>
        <ModalFooter>
          <Button color="white" onClick={handleClose} type="button">
            Close
          </Button>
          <IfFulfilled state={loadingState}>
            {() => (
              <Button color="success" onClick={saveData} type="button">
                Save
              </Button>
            )}
          </IfFulfilled>
        </ModalFooter>
      </Modal>
    );
  }
);

const Dictionary = ({
  varPrefix,
  label,
  types,
  form,
  defaults,
  color,
  field,
  loadDictionaries
}) => {
  const [modalShown, setModal] = React.useState(false);

  React.useEffect(() => {
    form.setFieldValue(field.name, getIn(defaults, field.name, []), false);
    form.setFieldValue(
      `${varPrefix}.disallow_repeats`,
      getIn(defaults, `${varPrefix}.disallow_repeats`, false),
      false
    );
    form.setFieldValue(
      `${varPrefix}.how_to_follow`,
      getIn(defaults, `${varPrefix}.how_to_follow`, "random"),
      false
    );

    return () => {
      form.unregisterField(field.name);
      form.setFieldValue(field.name, undefined, false);
      form.unregisterField(`${varPrefix}.disallow_repeats`);
      form.setFieldValue(`${varPrefix}.disallow_repeats`, undefined, false);
      form.unregisterField(`${varPrefix}.how_to_follow`);
      form.setFieldValue(`${varPrefix}.how_to_follow`, undefined, false);
    };
  }, []);

  const value = getIn(form.values, field.name, []);

  return (
    <div
      className={
        "form-group" +
        (getIn(form.touched, field.name) && getIn(form.errors, field.name)
          ? " form-group--error"
          : "")
      }
    >
      <div className="form-group__text">
        <label>{label}</label>
        <div className="panel panel--bordered like-input dictionary">
          <span className="dictionaries-selected flex-fill">
            {value.length ? (
              <>
                {value.length} selected:
                <span className="qtr-margin-left names">
                  {value.map(v => (
                    <Label size="small" color={color} key={v.id}>
                      {v.name}
                    </Label>
                  ))}
                </span>
              </>
            ) : (
              "None selected"
            )}
          </span>
          <span className="actions">
            <a
              className="dictionary-edit-link no-decor"
              onClick={() => setModal(true)}
            >
              <span className="icon-edit qtr-margin-right" />
              Edit
            </a>
          </span>
        </div>
      </div>
      {getIn(form.touched, field.name) && getIn(form.errors, field.name) ? (
        <InputHelpBlock text={getIn(form.errors, field.name)} />
      ) : null}
      <VarPrefix.Provider value={varPrefix}>
        <EditDictionary
          types={types}
          handleClose={() => {
            setModal(false);
            form.setFieldTouched(field.name);
          }}
          loadDictionaries={loadDictionaries}
          fieldName={field.name}
          isOpen={modalShown}
        />
      </VarPrefix.Provider>
    </div>
  );
};

Dictionary.propTypes = {
  varPrefix: PropTypes.string.isRequired,
  loadDictionaries: PropTypes.func.isRequired,
  label: PropTypes.string,
  types: PropTypes.array,
  color: PropTypes.string,
  defaults: PropTypes.any
};

Dictionary.defaultProps = {
  color: "default",
  defaults: {}
};

export default Dictionary;
