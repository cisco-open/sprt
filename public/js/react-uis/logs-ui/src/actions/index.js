import axios from "axios";

export const getLogsOwners = async () => {
  const response = await axios.get(`${globals.rest.logs}`, {
    headers: { Accept: "application/json" }
  });

  return response.data;
};

export const getChunks = async ([opts], { owner }) => {
  if (!owner) return { chunks: [] };

  opts = opts || {};
  opts.no_chunks = opts.no_chunks || false;
  opts.chunk = opts.chunk || "";
  opts.owner = opts.owner || "";

  let link = `${globals.rest.logs}owner/${opts.owner || owner}/`;
  if (opts.no_chunks) {
    opts.limit = opts.limit || 500;
    link += `no-chunks/limit/${opts.limit}/`;
    if (typeof opts.offset !== "undefined") link += `offset/${opts.offset}/`;
  }

  if (opts.chunk) {
    link += `chunk/${opts.chunk}/`;
  }

  const response = await axios.get(`${link}?${Date.now()}`, {
    headers: { Accept: "application/json" }
  });

  return response.data;
};

export const getChunkPreview = async ([], { owner, chunk }) => {
  let link = `${globals.rest.logs}owner/${owner}/chunk/${chunk}/preview/`;
  const response = await axios.get(`${link}?${Date.now()}`, {
    headers: { Accept: "application/json" }
  });

  return response.data;
};

export const deleteChunk = async (owner, chunk) => {
  const response = await axios.get(
    `${globals.rest.logs}owner/${owner}/remove/${chunk}/`,
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
};

export const downloadLogFile = async (owner, chunk, format) => {
  const response = await axios.get(
    `${globals.rest.logs}owner/${owner}/chunk/${chunk}/download/${format}/`,
    {
      responseType: "blob",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    }
  );

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link =
    document.getElementById("logs_downloader") || document.createElement("a");
  link.href = url;
  link.id = "logs_downloader";
  link.setAttribute("download", `sprt_logs.${format}`);
  document.body.appendChild(link);
  link.click();

  return true;
};
