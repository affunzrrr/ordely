# Ordely

An interactive, frontend-only prototype for pre-ordering overseas fashion and makeup in Sri Lanka. Shoppers can order individually or join an optional Collective Unlock purchase group. The customer site and the Admin demo use the same browser-local state. The catalogue photos are illustrative. Brand approvals, classifications, rates, evaluation results and payments are simulated. Product URLs are stored as supplied.

## Run locally

Serve this directory with any static HTTP server, such as `python -m http.server 8080`, and open `http://localhost:8080`. GitHub Pages serves `main` from the repository root.

Departments, Brands, Collective Unlock, My orders, and the Admin demo use static page URLs. Run `node build-pages.mjs` after editing the shared header or footer in `index.html` or adding a route in `routes.mjs`. Commit the generated pages with the source changes so GitHub Pages can serve each URL directly.

Choose **Try the demo account** to open sample orders, or create a demo profile to start with an empty order history. Use sample details in all forms. The **Admin demo** link in the footer opens the shared simulation controls. Clear this site's browser storage to reset the demo.
