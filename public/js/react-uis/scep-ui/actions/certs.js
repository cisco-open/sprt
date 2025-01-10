import axios from "axios";

import { getCertificate } from "../../radius_sessions-ui/src/actions";
import { updateHeaders, getHeaders } from "./headers";

export const loadSigningCerts = async () => {
  const response = await axios.post(
    globals.rest.cert.scep,
    { signers: 1 },
    { headers: updateHeaders }
  );

  return response.data;
};

export const loadSigningCert = async (id) => {
  const response = await axios.get(
    `${globals.rest.cert.scep}signer/details/${id}/`,
    { headers: getHeaders }
  );

  return response.data;
};

const updatePerType = {
  identity: "/cert/identity/",
  signer: "/cert/scep/signer/",
  trusted: async (_friendlyName, pem) => {
    const response = await axios.post(
      globals.rest.cert.trusted,
      { format: "text", trusted: pem },
      { headers: updateHeaders }
    );

    return response.data;
  },
};

export const saveCertificate = async (friendlyName, pem, type) => {
  if (!updatePerType[type])
    throw new Error(`Unknown certificate type: ${type}`);

  return updatePerType[type](friendlyName, pem);
};

export const renameCert = async (id, value) => {
  const response = await axios.patch(
    `${globals.rest.cert.attribute}friendly_name/${id}/`,
    { value },
    {
      headers: updateHeaders,
    }
  );

  return response.data;
};

export const loadCert = async ({ certId, certType }) =>
  getCertificate([{ certificate: certId, type: certType }]);

export const exportCert = async (params) => {
  const response = await axios.post(
    `${globals.rest.cert.base}export/`,
    params,
    {
      headers: updateHeaders,
    }
  );

  return response;
};

export const deleteSigners = async (what) => {
  const response = await axios.delete(`${globals.rest.cert.scep}signer/`, {
    data: { what },
    headers: updateHeaders,
  });

  return response.data;
};

export const uploadSignerCert = async (data) => {
  const response = await axios.post(`${globals.rest.cert.scep}signer/`, data, {
    headers: {
      ...getHeaders,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  });

  return response.data;
};
