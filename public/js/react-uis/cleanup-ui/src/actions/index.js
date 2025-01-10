import axios from "axios";
import { toast } from "react-cui-2.0";

const showMessages = (data) => {
  if (!data || !Array.isArray(data.messages) || !data.messages.length) return;

  data.messages.forEach((m) => toast(m.type, "", m.message));
};

const asyncGet = async (url) => {
  const res = await axios.get(url, {
    headers: { Accept: "application/json" },
  });

  showMessages(res.data);

  return res.data;
};

const asyncPut = async (url, data) => {
  const res = await axios.put(url, data, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  });

  showMessages(res.data);

  return res.data;
};

const asyncDel = async (url, data) => {
  const res = await axios.delete(url, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    data,
  });

  showMessages(res.data);

  return res.data;
};

export const getHealth = async ({ what, full }) => {
  full = full || false;

  return asyncGet(
    `${globals.rest.cleanups}health/${what}/?${
      full ? "full=1&t=" : ""
    }${Date.now()}`
  );
};

export const putHealth = async ({ what, data }) => {
  return asyncPut(
    `${globals.rest.cleanups}health/${what}/?${Date.now()}`,
    data
  );
};

export const cleanSessionsOlderThan = async ({ proto, days }) =>
  asyncGet(
    `${
      globals.rest.cleanups
    }clean/older-${days}/?proto=${proto}&t=${Date.now()}`
  );

export const cleanOrphanFlows = async () =>
  asyncGet(`${globals.rest.cleanups}clean/orphan-flows/?${Date.now()}`);

export const cleanOrphanCLIs = async () =>
  asyncGet(`${globals.rest.cleanups}clean/orphan-cli/?${Date.now()}`);

export const killPid = async (pid) =>
  asyncGet(`${globals.rest.cleanups}kill/${pid}/?${Date.now()}`);

export const removeCron = async (line, command, user) =>
  asyncDel(`${globals.rest.cleanups}cron/?${Date.now()}`, {
    line,
    command,
    user,
  });
