import React from "react";

import { AccordionElement, Accordion } from "react-cui-2.0";

import VarHOC from "./VarHOC";

export default ({ f, postfix }) => (
  <Accordion toggles>
    <AccordionElement defaultOpen={f.opened} title={f.title}>
      <VarHOC data={f.fields} postfix={postfix} />
    </AccordionElement>
  </Accordion>
);
