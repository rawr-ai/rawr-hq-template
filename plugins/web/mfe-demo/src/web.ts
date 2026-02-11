export const name = "@rawr/plugin-mfe-demo";

export function mount(el: HTMLElement, ctx: { baseUrl: string }) {
  const root = document.createElement("div");
  root.style.padding = "14px";
  root.style.border = "1px solid rgba(0,0,0,0.14)";
  root.style.borderRadius = "12px";
  root.style.background = "rgba(0,0,0,0.03)";

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.marginBottom = "8px";
  title.textContent = "Micro-frontend demo plugin";

  const meta = document.createElement("div");
  meta.style.opacity = "0.75";
  meta.style.marginBottom = "10px";
  meta.textContent = `plugin: ${name} · server: ${ctx.baseUrl}`;

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "10px";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Increment";

  const value = document.createElement("span");
  value.style.fontVariantNumeric = "tabular-nums";
  value.textContent = "0";

  let count = 0;
  button.addEventListener("click", () => {
    count += 1;
    value.textContent = String(count);
  });

  row.appendChild(button);
  row.appendChild(value);

  root.appendChild(title);
  root.appendChild(meta);
  root.appendChild(row);

  el.appendChild(root);

  return {
    unmount: () => {
      root.remove();
    },
  };
}

