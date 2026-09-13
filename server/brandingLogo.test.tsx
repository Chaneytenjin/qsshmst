// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BrandLogo, BRAND_LOGO_ALT } from "../client/src/components/BrandLogo";

describe("圓形純向量媒服 Logo", () => {
  afterEach(() => cleanup());

  it("以可存取的 SVG 圓形標誌呈現附件構圖，而不載入圖片或外部資產", () => {
    render(<BrandLogo data-testid="vector-brand-logo" className="h-16 w-16" />);

    const logo = screen.getByTestId("vector-brand-logo");
    expect(screen.getByRole("img", { name: BRAND_LOGO_ALT })).toBe(logo);
    expect(logo).toHaveAttribute("data-brand-logo-vector", "true");
    expect(logo).toHaveAttribute("data-brand-logo-loaded", "true");
    expect(logo).toHaveClass("brand-logo-vector", "rounded-full", "h-16", "w-16");
    expect(logo.querySelector("svg")).toHaveAttribute("viewBox", "0 0 240 240");
    expect(logo.querySelectorAll("circle")).not.toHaveLength(0);
    expect(logo.querySelectorAll("text")).toHaveLength(4);
    expect(logo.querySelector("svg")?.textContent).toContain("清水");
    expect(logo.querySelector("svg")?.textContent).toContain("媒體服務隊");
    expect(logo.querySelector("svg")?.textContent).toContain("第6屆");
    const textLayout = logo.querySelector('[data-brand-logo-text-layout="spaced"]');
    const textRows = textLayout?.querySelectorAll("text");
    expect(textRows).toHaveLength(3);
    expect(textRows?.[0]).toHaveAttribute("font-size", "57");
    expect(textRows?.[1]).toHaveAttribute("font-size", "23");
    expect(textRows?.[2]).toHaveAttribute("font-size", "19");
    expect(textRows?.[1]).toHaveAttribute("letter-spacing", "0.8");
    expect(textRows?.[2]).toHaveAttribute("letter-spacing", "0.4");
    expect(textLayout?.innerHTML).not.toContain('letter-spacing="-4"');
    expect(textLayout?.innerHTML).not.toContain('letter-spacing="-3"');
    expect(logo.querySelector("img")).not.toBeInTheDocument();
  });

  it("所有品牌入口均透過共用純向量元件，並不再保留受管理 Logo 圖片網址", () => {
    const brandSources = [
      "client/src/App.tsx",
      "client/src/components/AppLayout.tsx",
      "client/src/pages/Home.tsx",
      "client/src/pages/Login.tsx",
      "client/src/pages/CertificateVerify.tsx",
      "client/src/pages/Profile.tsx",
      "client/src/pages/QrCodeBorrowReturn.tsx",
    ].map((path) => readFileSync(path, "utf8"));

    brandSources.forEach((source) => expect(source).toContain("BrandLogo"));
    const vectorSource = readFileSync("client/src/components/BrandLogo.tsx", "utf8");
    expect(vectorSource).toContain('viewBox="0 0 240 240"');
    expect(vectorSource).toContain("#1bacc4");
    expect(vectorSource).not.toContain("/manus-storage/");
    expect(vectorSource).not.toContain("<img");
    expect(vectorSource).not.toContain("new Image");
    expect(vectorSource).not.toContain("reportFailure");
  });

  it("瀏覽器圖示與品牌樣式均改用向量圓形版本", () => {
    const html = readFileSync("client/index.html", "utf8");
    const css = readFileSync("client/src/index.css", "utf8");

    expect(html).toContain('type="image/svg+xml" href="/favicon.svg"');
    expect(css).toContain(".brand-logo-vector");
    expect(css).toContain("background: #1bacc4");
    expect(css).toContain(".recovery-code-print-logo");
    expect(css).not.toContain(".recovery-code-print-header img");
  });
});
