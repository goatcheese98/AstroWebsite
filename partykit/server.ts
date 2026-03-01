import type * as Party from "partykit/server";

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default class ProxyParty implements Party.Server {
  // HTTP-only PartyKit endpoint used by WebEmbed proxy requests.
  async onRequest(req: Party.Request): Promise<Response> {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get("url");

    if (req.method === "GET" && targetUrl) {
      try {
        const parsedTargetUrl = new URL(targetUrl);
        if (
          parsedTargetUrl.protocol !== "http:" &&
          parsedTargetUrl.protocol !== "https:"
        ) {
          return new Response("Unsupported protocol", { status: 400 });
        }
        const normalizedTargetUrl = parsedTargetUrl.href;

        const response = await fetch(normalizedTargetUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("text/html")) {
          let body = await response.text();
          const baseTag = `<base href="${escapeHtmlAttr(normalizedTargetUrl)}">`;
          const script = `
            <script>
              (function() {
                const PROXY_BASE = window.location.origin + window.location.pathname;
                const BASE_TARGET = ${JSON.stringify(normalizedTargetUrl)};
                function notifyParent(url) {
                  try {
                    if (window.parent && window.parent !== window) {
                      window.parent.postMessage({ type: "iframe-navigation", url: url }, "*");
                    }
                  } catch (e) {
                    console.error("Failed to notify parent:", e);
                  }
                }

                const currentUrl = new URLSearchParams(window.location.search).get("url");
                if (currentUrl) notifyParent(currentUrl);

                function wrapUrl(targetUrl) {
                  try {
                    const base = currentUrl || BASE_TARGET;
                    return PROXY_BASE + "?url=" + encodeURIComponent(new URL(targetUrl, base).href);
                  } catch (e) {
                    return targetUrl;
                  }
                }

                document.addEventListener("click", function(e) {
                  const link = e.target.closest("a");
                  if (link && link.href && !link.href.startsWith("javascript:")) {
                    e.preventDefault();
                    const href = link.getAttribute("href");
                    const absoluteUrl = new URL(href, currentUrl || BASE_TARGET).href;
                    notifyParent(absoluteUrl);
                    window.location.href = wrapUrl(href);
                  }
                }, true);

                document.addEventListener("submit", function(e) {
                  e.preventDefault();
                  const form = e.target;
                  const targetUrl = new URL(form.getAttribute("action") || "", currentUrl || BASE_TARGET);
                  if (form.method.toLowerCase() === "get") {
                    const formData = new FormData(form);
                    for (let [k, v] of formData.entries()) targetUrl.searchParams.append(k, v);
                    notifyParent(targetUrl.href);
                    window.location.href = PROXY_BASE + "?url=" + encodeURIComponent(targetUrl.href);
                  }
                }, true);

                function notifyCurrentLocation() {
                  try {
                    notifyParent(window.location.href);
                  } catch (e) {}
                }

                const originalPushState = history.pushState;
                const originalReplaceState = history.replaceState;
                history.pushState = function() {
                  const result = originalPushState.apply(this, arguments);
                  notifyCurrentLocation();
                  return result;
                };
                history.replaceState = function() {
                  const result = originalReplaceState.apply(this, arguments);
                  notifyCurrentLocation();
                  return result;
                };
                window.addEventListener("popstate", notifyCurrentLocation);
              })();
            </script>
          `;

          // CSP can also be delivered via <meta http-equiv>, which breaks proxied
          // pages because "self" changes to this proxy origin.
          body = body
            .replace(
              /<meta[^>]+http-equiv\s*=\s*["']?content-security-policy(?:-report-only)?["']?[^>]*>/gi,
              ""
            )
            .replace(/<base\b[^>]*>/gi, "");

          if (/<head[^>]*>/i.test(body)) {
            body = body.replace(/<head([^>]*)>/i, `<head$1>${baseTag}${script}`);
          } else if (/<html[^>]*>/i.test(body)) {
            body = body.replace(/<html([^>]*)>/i, `<html$1><head>${baseTag}${script}</head>`);
          } else {
            body = `<head>${baseTag}${script}</head>${body}`;
          }

          const headers = new Headers(response.headers);
          headers.delete("x-frame-options");
          headers.delete("content-security-policy");
          headers.delete("content-security-policy-report-only");
          headers.set("access-control-allow-origin", "*");
          headers.set("access-control-allow-methods", "*");
          headers.set("access-control-allow-headers", "*");

          return new Response(body, {
            status: response.status,
            headers,
          });
        }

        const headers = new Headers(response.headers);
        headers.set("access-control-allow-origin", "*");
        headers.set("access-control-allow-methods", "*");
        headers.set("access-control-allow-headers", "*");

        return new Response(response.body, {
          status: response.status,
          headers,
        });
      } catch (error) {
        return new Response(`Error fetching url: ${(error as Error).message}`, {
          status: 500,
        });
      }
    }

    return new Response("Not found", { status: 404 });
  }
}
