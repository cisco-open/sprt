import axios from "axios";

import { getHeaders } from "./headers";

export const loadDictionaries = async ({ types }) => {
  const res = await axios.get(
    globals.rest.dictionaries.by_type +
      types.join(",") +
      "/columns/id,name,type/combine/type/",
    {
      params: { _: new Date().getTime() },
      headers: getHeaders,
    }
  );
  return res.data;
};
