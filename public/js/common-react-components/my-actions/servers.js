import axios from "axios";

import { getHeaders, updateHeaders } from "./headers";

export const loadServers = async () => {
  const res = await axios.get(`${globals.rest.servers.base}`, {
    params: { _: new Date().getTime() },
    headers: getHeaders,
  });

  return res.data;
};

export const loadServer = async (id) => {
  const res = await axios.get(`${globals.rest.servers.server}${id}/`, {
    params: { _: new Date().getTime() },
    headers: getHeaders,
  });

  return res.data;
};

export const loadServersDropdown = async () => {
  const res = await axios.get(`${globals.rest.servers.dropdown}`, {
    params: { _: new Date().getTime() },
    headers: getHeaders,
  });

  return res.data;
};

export const saveServer = async ({ id, ...server }) => {
  const res = await axios.post(
    `${globals.rest.servers.server}${id}/`,
    { server },
    {
      headers: updateHeaders,
    }
  );

  return res.data;
};

export const deleteServer = async ({ id }) => {
  await axios.delete(globals.rest.servers.base, {
    data: { servers: `id:${id}` },
    headers: updateHeaders,
  });
};
