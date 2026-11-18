import { flatRoutes } from "@react-router/fs-routes";

/**
 * The obsolete pathless _layout.jsx has no nested routes.
 * Keeping it as a registered route causes react-router's type generator to emit
 * an invalid "page: ;" entry, so ignore it without deleting the source file.
 */
export default flatRoutes({ ignoredRouteFiles: ["_layout.jsx"] });
