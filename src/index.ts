import { mountConverterUi } from "./app/converterUi";

const appRoot = document.querySelector<HTMLElement>("#app");

if (appRoot === null) {
  throw new Error("The Sprite Converter app root is missing.");
}

mountConverterUi(appRoot);
