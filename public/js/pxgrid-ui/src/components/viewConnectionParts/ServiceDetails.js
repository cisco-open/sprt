import React from "react";

import { Accordion, AccordionElement } from "react-cui-2.0";

import ServiceLookup from "./ServiceLookup";

export default ({ service, serviceData, id }) => (
  <Accordion toggles>
    <AccordionElement title="Details" defaultOpen={false}>
      <div>
        <dl className="dl--inline-wrap dl--inline-centered">
          <dt className="qtr-padding">Service</dt>
          <dd className="qtr-padding">{service}</dd>
          {serviceData.services.map((s) => (
            <React.Fragment key={s.nodeName}>
              <dt key={`dt-${s.nodeName}`} className="qtr-padding">
                {`${s.nodeName} properties`}
              </dt>
              <dd key={`dd-${s.nodeName}`}>
                <table className="table table--nostripes table--compressed">
                  <tbody>
                    {Object.keys(s.properties).map((k) => (
                      <tr key={`${s.nodeName}-${k}`}>
                        <td style={{ borderLeft: "none" }}>{k}</td>
                        <td>{s.properties[k]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </dd>
            </React.Fragment>
          ))}
        </dl>
        <ServiceLookup
          type="link"
          title="Lookup again"
          connection={id}
          service={service}
        />
      </div>
    </AccordionElement>
  </Accordion>
);
