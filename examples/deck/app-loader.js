export function isCurrentDeckExampleMount(moduleMountId, activeMountId) {
  return !moduleMountId || String(activeMountId) === moduleMountId;
}

export function resolveDeckExampleViewMode({
  embeddedViewMode,
  queryViewMode,
  viewModes,
  defaultViewMode = 'mapPerspective'
}) {
  const requestedViewMode = embeddedViewMode || queryViewMode;
  return Object.hasOwn(viewModes, requestedViewMode) ? requestedViewMode : defaultViewMode;
}

export async function initializeCurrentDeckExample({
  moduleUrl,
  getActiveMountId,
  embeddedViewMode,
  loadRuntime = (runtimeUrl) => import(runtimeUrl)
}) {
  const loaderUrl = new URL(moduleUrl);
  const moduleMountId = loaderUrl.searchParams.get('mount');
  if (!isCurrentDeckExampleMount(moduleMountId, getActiveMountId())) {
    return false;
  }

  const runtimeUrl = new URL('./app-runtime.js', loaderUrl);
  runtimeUrl.search = loaderUrl.search;
  const runtime = await loadRuntime(runtimeUrl.href);
  if (!isCurrentDeckExampleMount(moduleMountId, getActiveMountId())) {
    return false;
  }

  runtime.initializeDeckExample({embeddedViewMode});
  return true;
}
