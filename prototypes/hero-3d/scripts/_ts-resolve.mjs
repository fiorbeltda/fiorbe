// Resolve imports relativos sem extensão para .ts (scripts de diagnóstico em Node).
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); }
  catch (e) { if (spec.startsWith(".")) return next(spec + ".ts", ctx); throw e; }
}
