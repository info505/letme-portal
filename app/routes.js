import { flatRoutes } from "@react-router/fs-routes";

/**
 * Ignore only the orphan legacy pathless layout.
 * There are no route files nested under "_layout.", so removing this entry
 * changes no addressable screen or customer action.
 * The installed type generator otherwise emits an invalid "page: ;" type.
 */
export default flatRoutes({ ignoredRouteFiles: ["_layout.jsx", "**/_layout.jsx"] }).then(routes =>
  routes.filter(route => !String(route.file || "").endsWith("/_layout.jsx"))
);
