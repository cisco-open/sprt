import axios from "axios";

import { getHeaders, updateHeaders } from "./headers";

export const getTopMenu = async () => {
  const res = await axios.get(`/api/ui/menu/`, {
    params: { _: new Date().getTime() },
    headers: getHeaders,
  });

  return res.data;
};

export const getSubmenu = async ({ from }) => {
  const res = await axios.get(from, {
    params: { _: new Date().getTime() },
    headers: getHeaders,
  });

  return res.data;
};

export { getSubmenu as simpleGet };

export const updateTheme = async (theme) => {
  const r = await axios.put(
    `/api/ui/theme/`,
    { theme },
    { headers: updateHeaders }
  );

  return r.data;
};
