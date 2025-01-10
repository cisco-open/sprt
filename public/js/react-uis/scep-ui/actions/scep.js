import axios from "axios";

import { updateHeaders, getHeaders } from "./headers";

export const loadSCEPServers = async () => {
  const response = await axios.post(
    globals.rest.cert.scep,
    { scep_servers: 1 },
    { headers: updateHeaders }
  );

  return response.data;
};

export const loadSCEPServer = async (id) => {
  const response = await axios.get(`${globals.rest.cert.scep}${id}/`, {
    headers: getHeaders,
  });

  return response.data;
};

export const saveSCEPServer = async (
  href,
  name,
  certificates,
  signer,
  overwrite,
  id
) => {
  const response = await axios.put(
    `${globals.rest.cert.scep}${id && id !== "new" ? `${id}/` : ""}`,
    { href, name, certificates, signer, overwrite },
    { headers: updateHeaders }
  );

  return response.data;
};

export const testSCEPConnection = async (name, href) => {
  const response = await axios.post(
    `${globals.rest.cert.scep}test-scep/`,
    { name, href },
    { headers: updateHeaders }
  );

  return response.data;
};

export const testSCEPEnroll = async (
  name,
  href,
  signer,
  certificates,
  csr = undefined
) => {
  const data = {
    name,
    href,
    signer,
    certificates,
  };
  if (csr) data.csr = csr;

  const response = await axios.post(
    `${globals.rest.cert.scep}test-scep-enroll/`,
    data,
    { headers: updateHeaders }
  );

  return response.data;
};

export const deleteSCEP = async (what) => {
  const response = await axios.delete(globals.rest.cert.scep, {
    data: { what: Array.isArray(what) ? what : [what] },
    headers: updateHeaders,
  });

  return response.data;
};
