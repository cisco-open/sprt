import { createContext } from "react";

export const VarContext = createContext();

export const parseStyles = styles =>
  styles
    .split(";")
    .filter(style => style.split(":")[0] && style.split(":")[1])
    .map(style => [
      style
        .split(":")[0]
        .trim()
        .replace(/-./g, c => c.substr(1).toUpperCase()),
      style
        .split(":")
        .slice(1)
        .join(":")
        .trim()
    ])
    .reduce(
      (styleObj, style) => ({
        ...styleObj,
        [style[0]]: style[1]
      }),
      {}
    );

export const elementStyle = style =>
  typeof style !== "string" ? style : parseStyles(style);

export const simpleValidator = (value, regex) => {
  if (!regex) return;

  if (typeof regex === "string" && regex !== "1") {
    regex = new RegExp(regex, "i");
  } else {
    regex = /[^\s]+/;
  }

  return regex.test(value) ? undefined : "Incorrect value";
};

export const insertAtCursor = (field, value) => {
  if (field.selectionStart || field.selectionStart == "0") {
    var startPos = field.selectionStart;
    var endPos = field.selectionEnd;
    return (
      field.value.substring(0, startPos) +
      value +
      field.value.substring(endPos, field.value.length)
    );
  } else {
    return field.value + value;
  }
};
