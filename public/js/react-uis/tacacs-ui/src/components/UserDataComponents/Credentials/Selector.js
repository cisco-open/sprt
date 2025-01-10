import React from "react";

import { VariantSelectorFormik } from "my-composed/VariantSelectorFormik";

import List from "./List";
import CredentialsDictionary from "./CredentialsDictionary";

const Selector = () => (
  <VariantSelectorFormik
    variants={[
      {
        variant: "list",
        display: "From list",
        component: <List />,
      },
      {
        variant: "dictionary",
        display: "From dictionary",
        component: <CredentialsDictionary />,
      },
    ]}
    varPrefix="auth.credentials"
    title="Credentials:"
  />
);

export default Selector;
