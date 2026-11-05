import { courses, materials, materialKey, materialLink, type CourseId } from "./catalog";
export function rememberMaterial(hash: string) {
  const [route, query] = hash.split("?");
  const course = route.slice(2).split("/")[0];
  const id = new URLSearchParams(query).get("item");
  const material = materials.find(m => m.course === course && m.id === id);
  if (material) try { localStorage.setItem(`colloquium-last-material-${course}`, materialKey(material)); } catch { /* Reading remains available without storage. */ }
}
export function lastMaterial(course: CourseId) {
  try { const key = localStorage.getItem(`colloquium-last-material-${course}`); return materials.find(m => m.course === course && materialKey(m) === key); } catch { return undefined; }
}
export function resumeHref(course: CourseId, fallback = `#/${course}/${courses[course].start}`) {
  const material = lastMaterial(course);
  return material ? materialLink(material) : fallback;
}
export function toggleDensity() {
  const density = document.documentElement.dataset.density === "compact" ? "comfortable" : "compact";
  document.documentElement.dataset.density = density;
  try { localStorage.setItem("colloquium-ui-density", density); } catch { /* Session preference still works. */ }
  window.dispatchEvent(new Event("workspace-density"));
}
