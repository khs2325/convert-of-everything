import { mountConverterUi } from "./app/converterUi";

const appRoot = document.querySelector<HTMLElement>("#app");

if (appRoot === null) {
  throw new Error("The Convert of Everything app root is missing.");
}

mountConverterUi(appRoot);
