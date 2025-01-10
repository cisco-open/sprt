import axios from "axios";

import { getHeaders } from "./headers";

export const getSourceIPs = async () => {
  const res = await axios.get(`${globals.rest.generate}get-nad-ips/`, {
    params: { _: new Date().getTime() },
    headers: getHeaders,
  });

  return res.data;
};
