import React from "react";
import PropTypes from "prop-types";
import { getIn } from "formik";

export const Checkboxes = ({ field, form, variants, inline }) => (
  <FieldArray
    name={field.name}
    render={arrayHelpers =>
      variants.map(variant => (
        <div
          className={`form-group ${inline ? "form-group--inline" : ""}`}
          key={variant.id}
        >
          <label class="checkbox">
            <input
              name={field.name}
              type="checkbox"
              value={variant.id}
              checked={getIn(form.values, field.name, []).includes(variant.id)}
              onChange={e => {
                if (e.target.checked) arrayHelpers.push(variant.id);
                else {
                  const idx = getIn(form.values, field.name, []).indexOf(
                    variant.id
                  );
                  arrayHelpers.remove(idx);
                }
              }}
            />
            <span class="checkbox__input" />
            <span class="checkbox__label">{variant.name}</span>
          </label>
        </div>
      ))
    }
  />
);

Checkboxes.propTypes = {
  inline: PropTypes.bool,
  variants: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string
    })
  )
};
