import type * as Party from "partykit/server";

export default class ProxyParty implements Party.Server {
  // HTTP-only PartyKit endpoint used by WebEmbed proxy requests.
  async onRequest(req: Party.Request): Promise<Response> {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get("url");

    if (req.method === "GET" && targetUrl) {
      try {
        const response = await fetch(targetUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("text/html")) {
          let body = await response.text();
          const script = `
            <script>
              (function() {
                const PROXY_BASE = window.location.origin + window.location.pathname;
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
                    const base = currentUrl || "${targetUrl}";
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
                    const absoluteUrl = new URL(href, currentUrl || "${targetUrl}").href;
                    notifyParent(absoluteUrl);
                    window.location.href = wrapUrl(href);
                  }
                }, true);

                document.addEventListener("submit", function(e) {
                  e.preventDefault();
                  const form = e.target;
                  const targetUrl = new URL(form.getAttribute("action") || "", currentUrl || "${targetUrl}");
                  if (form.method.toLowerCase() === "get") {
                    const formData = new FormData(form);
                    for (let [k, v] of formData.entries()) targetUrl.searchParams.append(k, v);
                    notifyParent(targetUrl.href);
                    window.location.href = PROXY_BASE + "?url=" + encodeURIComponent(targetUrl.href);
                  }
                }, true);
              })();
            </script>
          `;

          body = body.replace("</head>", `${script}</head>`);

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
