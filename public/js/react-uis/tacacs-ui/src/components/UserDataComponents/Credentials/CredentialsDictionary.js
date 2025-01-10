import React from "react";
import { Field } from "formik";

import { loadDictionaries } from "my-actions";
import Dictionary from "my-composed/Dictionary";
import { OptionsContext } from "../../../contexts";

const CredentialsDictionary = () => {
  const options = React.useContext(OptionsContext);

  return (
    <div className="tab animated fadeIn fast active-tab">
      <Field
        component={Dictionary}
        name="auth.credentials.dictionary"
        varPrefix="auth.credentials"
        label="Dictionaries"
        types={["credentials"]}
        defaults={options}
        loadDictionaries={loadDictionaries}
        validate={(v) => {
          let error;
          if (Array.isArray(v) && !v.length)
            error = "Select at least one dictionary";
          return error;
        }}
      />
    </div>
  );
};

export default CredentialsDictionary;
