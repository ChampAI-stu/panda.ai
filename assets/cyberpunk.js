import * as THREE from "./three.module.min.js";

const $ = (selector, root = document) => root.querySelector(selector);
const palette = ["#5ee7ff", "#985dff", "#ff48da", "#d9ff63"];

const fallbackProfile = {
  name: "CHAMP AI",
  role: "AI Automation & Digital Experience Designer",
  location: "Bangkok, Thailand",
  bio: "I design intelligent systems, immersive digital products, and automation that turns complex work into clear human experiences.",
  openToWork: true,
  taglines: ["AI SYSTEMS DESIGNER", "AUTOMATION ARCHITECT", "IMMERSIVE EXPERIENCE BUILDER"],
  socials: {},
  experience: [{
    role: "AI Systems & Automation",
    company: "Independent Practice",
    from: "2024",
    to: "Present",
    highlights: [
      "Designing AI-assisted workflows that connect people, data, and operations.",
      "Building expressive web experiences where motion supports the story and the interface."
    ]
  }],
  education: [],
  awards: [],
  skills: ["AI Automation", "Product Design", "Creative Direction", "Web Experience", "Data Systems", "Rapid Prototyping"],
  works: [
    { kind: "SYSTEM", title: "Autonomous Hiring Intelligence", desc: "A decision-support experience that turns recruitment signals into a clear, visual assessment flow.", tag: "AI / AUTOMATION", date: "2026", pub: true },
    { kind: "EXPERIENCE", title: "Immersive Operations Command", desc: "A cinematic control surface for exploring live operations without sacrificing everyday usability.", tag: "3D / PRODUCT", date: "2026", pub: true },
    { kind: "DESIGN", title: "Generative Brand Systems", desc: "A modular visual language that scales from responsive interfaces to motion-led campaign assets.", tag: "ART / SYSTEM", date: "2026", pub: true }
  ],
  _updated: "2026 / 08 / 20"
};

let currentProfile = fallbackProfile;
let currentWorks = [];
let currentFilter = "ALL";
let revealObserver;
let motionActive = true;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function skillName(skill) {
  return typeof skill === "string" ? skill : (skill && skill.name) || "";
}

function safeUrl(value, allowImageData = false) {
  if (!value) return "";
  if (allowImageData && /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value)) return value;
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function normalizeProfile(value, updatedAt) {
  if (!value || typeof value !== "object") return fallbackProfile;
  return {
    ...fallbackProfile,
    ...value,
    socials: value.socials || {},
    experience: Array.isArray(value.experience) ? value.experience : [],
    education: Array.isArray(value.education) ? value.education : [],
    awards: Array.isArray(value.awards) ? value.awards : [],
    skills: Array.isArray(value.skills) ? value.skills : [],
    works: Array.isArray(value.works) ? value.works : [],
    _updated: updatedAt ? updatedAt.slice(0, 10).replace(/-/g, " / ") : value._updated || fallbackProfile._updated
  };
}

async function loadProfile() {
  try {
    const editorResponse = await fetch("./edit.html", { cache: "no-store" });
    if (!editorResponse.ok) throw new Error("Editor configuration unavailable");
    const editorSource = await editorResponse.text();
    const url = editorSource.match(/SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1];
    const key = editorSource.match(/SUPABASE_ANON\s*=\s*"([^"]+)"/)?.[1];
    if (!url || !key) throw new Error("Portfolio configuration unavailable");

    const response = await fetch(`${url}/rest/v1/resume?select=data,updated_at&slug=eq.main&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Portfolio data unavailable");
    const rows = await response.json();
    if (!rows[0]?.data) throw new Error("Portfolio is empty");
    renderProfile(normalizeProfile(rows[0].data, rows[0].updated_at));
  } catch {
    renderProfile(fallbackProfile);
  }
}

function proceduralPlate(index) {
  return `<div class="procedural-plate plate-${index % 3}" aria-hidden="true">
    <span class="plate-grid"></span><span class="plate-halo halo-a"></span><span class="plate-halo halo-b"></span>
    <span class="plate-core"></span><span class="plate-shard shard-a"></span><span class="plate-shard shard-b"></span><span class="plate-noise"></span>
  </div>`;
}

function renderProjects() {
  const grid = $("#project-grid");
  const rows = currentFilter === "ALL" ? currentWorks : currentWorks.filter(work => (work.kind || "WORK") === currentFilter);
  grid.innerHTML = "";

  rows.forEach((work, index) => {
    const article = document.createElement("article");
    article.className = "project-card";
    article.dataset.reveal = "";
    article.style.setProperty("--project-color", palette[index % palette.length]);
    const link = safeUrl(work.link);
    const image = safeUrl(work.image, true);
    const visual = image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy">` : proceduralPlate(index);
    const body = `<div class="project-visual">${visual}<div class="project-scan"></div><span class="project-index">0${index + 1}</span><span class="project-kind">${escapeHtml(work.kind || "WORK")}</span></div>
      <div class="project-copy"><div class="project-meta"><span>${escapeHtml(work.tag || "SELECTED WORK")}</span><span>${escapeHtml(work.date || "ARCHIVE")}</span></div>
      <h3>${escapeHtml(work.title || "Untitled Project")}</h3>${work.desc ? `<p>${escapeHtml(work.desc)}</p>` : ""}
      <span class="project-action">${link ? "OPEN PROJECT" : "VIEW ARCHIVE"} <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></span></div>`;
    article.innerHTML = link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(work.title)}">${body}</a>` : `<div>${body}</div>`;
    article.addEventListener("pointermove", event => {
      const rect = article.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      article.style.setProperty("--rx", `${-y * 8}deg`);
      article.style.setProperty("--ry", `${x * 10}deg`);
      article.style.setProperty("--mx", `${(x + .5) * 100}%`);
      article.style.setProperty("--my", `${(y + .5) * 100}%`);
    });
    article.addEventListener("pointerleave", () => {
      article.style.setProperty("--rx", "0deg");
      article.style.setProperty("--ry", "0deg");
    });
    grid.appendChild(article);
  });
  observeReveals();
}

function renderFilters() {
  const bar = $("#filter-bar");
  const kinds = ["ALL", ...new Set(currentWorks.map(work => work.kind || "WORK"))];
  bar.innerHTML = "";
  kinds.forEach(kind => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = kind;
    button.classList.toggle("active", kind === currentFilter);
    button.addEventListener("click", () => {
      currentFilter = kind;
      renderFilters();
      renderProjects();
    });
    bar.appendChild(button);
  });
}

function renderExperience(profile) {
  const log = $("#experience-log");
  log.innerHTML = "";
  (profile.experience || []).forEach((item, index) => {
    const article = document.createElement("article");
    article.className = "log-entry";
    article.dataset.reveal = "";
    article.innerHTML = `<div class="log-index">${String(index + 1).padStart(2, "0")}</div><div class="log-main">
      <div class="log-meta"><span>${escapeHtml([item.from, item.to].filter(Boolean).join(" — "))}</span><span>${escapeHtml(item.loc || profile.location || "")}</span></div>
      <h3>${escapeHtml(item.role)}</h3>${item.company ? `<h4>${escapeHtml(item.company)}</h4>` : ""}
      ${Array.isArray(item.highlights) && item.highlights.filter(Boolean).length ? `<ul>${item.highlights.filter(Boolean).map(line => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}</div>`;
    log.appendChild(article);
  });
  [
    ["education", "ED", "EDUCATION"],
    ["awards", "AW", "RECOGNITION"]
  ].forEach(([key, code, label]) => {
    (profile[key] || []).forEach(item => {
      const article = document.createElement("article");
      article.className = "log-entry compact";
      article.dataset.reveal = "";
      article.innerHTML = `<div class="log-index">${code}</div><div class="log-main"><div class="log-meta"><span>${label}</span><span>${escapeHtml(item.meta || "")}</span></div><h3>${escapeHtml(item.title)}</h3>${item.body ? `<p>${escapeHtml(item.body)}</p>` : ""}</div>`;
      log.appendChild(article);
    });
  });
}

function renderSkills(profile) {
  const skills = (profile.skills || []).map(skillName).filter(Boolean);
  const section = $("#skills-section");
  section.hidden = skills.length === 0;
  $("#skills-track").innerHTML = [...skills, ...skills].map(skill => `<span><i>✦</i>${escapeHtml(skill)}</span>`).join("");
  $("#skills-cloud").innerHTML = skills.map((skill, index) => `<span style="--delay:${index * -.7}s">${escapeHtml(skill)}</span>`).join("");
}

function renderSocials(profile) {
  const strip = $("#social-strip");
  strip.innerHTML = "";
  Object.entries(profile.socials || {}).forEach(([name, value]) => {
    const url = safeUrl(value);
    if (!url) return;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = `${name.toUpperCase()} ↗`;
    strip.appendChild(anchor);
  });
}

function renderProfile(profile) {
  currentProfile = profile;
  currentWorks = (profile.works || []).filter(work => work.pub !== false);
  if (!currentWorks.length) currentWorks = profile.works || [];
  currentFilter = "ALL";
  const name = profile.name || "PORTFOLIO";
  const firstName = name.split(/\s+/)[0] || "PORTFOLIO";
  document.title = `${name} — Cyberpunk Portfolio`;
  $("#brand-name").textContent = firstName.toUpperCase();
  $("#profile-name").textContent = name;
  $("#hero-role").textContent = profile.role || "DIGITAL EXPERIENCE DESIGNER";
  $("#hero-bio").textContent = profile.bio || fallbackProfile.bio;
  $("#about-bio").textContent = profile.bio || fallbackProfile.bio;
  $("#profile-location").textContent = profile.location || "CONNECTED";
  $("#profile-focus").textContent = profile.taglines?.[0] || profile.role || "DIGITAL CREATOR";
  $("#profile-status").textContent = profile.openToWork === false ? "BUILDING" : "AVAILABLE";
  $("#copyright").textContent = `© ${new Date().getFullYear()} ${name}`;
  $("#last-sync").textContent = `LAST SYNC / ${profile._updated || "CURRENT"}`;

  const avatar = $("#avatar-hologram");
  const photo = safeUrl(profile.photo, true);
  avatar.innerHTML = photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}"><i class="avatar-scan"></i>` : `<span>${escapeHtml(name.slice(0, 1))}</span><i class="avatar-scan"></i>`;
  const contact = $("#contact-button");
  if (profile.email) {
    contact.href = `mailto:${encodeURIComponent(profile.email)}`;
    contact.childNodes[0].nodeValue = "INITIATE SIGNAL ";
  } else {
    contact.href = "#top";
    contact.childNodes[0].nodeValue = "RETURN TO CORE ";
  }
  renderFilters();
  renderProjects();
  renderExperience(profile);
  renderSkills(profile);
  renderSocials(profile);
  observeReveals();
}

function observeReveals() {
  if (revealObserver) revealObserver.disconnect();
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle("is-visible", entry.isIntersecting));
  }, { threshold: .12, rootMargin: "0px 0px -8%" });
  document.querySelectorAll("[data-reveal]").forEach(node => revealObserver.observe(node));
}

function setupMotion() {
  const stored = localStorage.getItem("portfolio-motion");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  motionActive = stored ? stored === "on" : !reduced;
  const button = $("#motion-toggle");
  const paint = () => {
    document.documentElement.classList.toggle("motion-off", !motionActive);
    button.classList.toggle("is-on", motionActive);
    button.setAttribute("aria-label", `${motionActive ? "Disable" : "Enable"} animation`);
    $("span", button).textContent = motionActive ? "MOTION ON" : "MOTION OFF";
  };
  paint();
  button.addEventListener("click", () => {
    motionActive = !motionActive;
    localStorage.setItem("portfolio-motion", motionActive ? "on" : "off");
    paint();
  });

  $("#site-shell").addEventListener("pointermove", event => {
    if (!motionActive) return;
    const shell = $("#site-shell");
    shell.style.setProperty("--pointer-x", String(event.clientX / innerWidth - .5));
    shell.style.setProperty("--pointer-y", String(event.clientY / innerHeight - .5));
  }, { passive: true });
}

function setupPdf() {
  ["#download-pdf", "#download-pdf-secondary"].forEach(selector => {
    $(selector).addEventListener("click", () => makePdf(currentProfile));
  });
}

function makePdf(profile) {
  if (!window.jspdf?.jsPDF) {
    window.print();
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const right = 192;
  const pageHeight = 297;
  let y = 22;
  const ensure = height => { if (y + height > pageHeight - margin) { doc.addPage(); y = 22; } };
  const paragraph = (text, size = 9.5) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(size); doc.setTextColor(58, 61, 74);
    doc.splitTextToSize(String(text), right - margin).forEach(line => { ensure(5); doc.text(line, margin, y); y += 4.8; });
  };
  const section = title => { ensure(12); y += 4; doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(103, 80, 220); doc.text(title.toUpperCase(), margin, y); y += 6; };

  doc.setFillColor(8, 9, 17); doc.rect(0, 0, 210, 44, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.text((profile.name || "PORTFOLIO").toUpperCase(), margin, y); y += 8;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(138, 227, 255); doc.text([profile.role, profile.location].filter(Boolean).join(" / "), margin, y); y = 52;
  if (profile.bio) paragraph(profile.bio, 10);
  if (profile.experience?.length) {
    section("Experience");
    profile.experience.forEach(item => {
      ensure(10); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(18, 20, 29); doc.text([item.role, item.company].filter(Boolean).join(" / "), margin, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(104, 108, 120); doc.text([item.from, item.to].filter(Boolean).join(" - "), right, y, { align: "right" }); y += 5;
      (item.highlights || []).filter(Boolean).forEach(line => paragraph(`- ${line}`, 9)); y += 2;
    });
  }
  if (profile.education?.length) { section("Education"); profile.education.forEach(item => { paragraph(`${item.title}${item.meta ? ` / ${item.meta}` : ""}`); if (item.body) paragraph(item.body, 9); y += 2; }); }
  if (profile.awards?.length) { section("Awards"); profile.awards.forEach(item => paragraph(`${item.title}${item.meta ? ` / ${item.meta}` : ""}`)); }
  if (profile.skills?.length) { section("Capabilities"); paragraph(profile.skills.map(skillName).join(" / ")); }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) { doc.setPage(page); doc.setFontSize(7.5); doc.setTextColor(130, 134, 145); doc.text(`CYBERPUNK PORTFOLIO / ${page} OF ${pages}`, margin, 287); }
  const filename = (profile.name || "portfolio").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "portfolio";
  doc.save(`${filename}_resume.pdf`);
}

function initThreeScene() {
  const canvas = $("#signal-canvas");
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050712, .085);
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
    camera.position.set(0, 0, 7.2);
    const root = new THREE.Group(); root.position.set(1.25, .1, 0); scene.add(root);
    const ambient = new THREE.AmbientLight(0x4e5fff, 1.3);
    const cyan = new THREE.PointLight(0x52efff, 22, 16); cyan.position.set(3.5, 2.6, 4);
    const magenta = new THREE.PointLight(0xff45d7, 18, 14); magenta.position.set(-2.5, -2.2, 3); scene.add(ambient, cyan, magenta);
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x5038ff, metalness: .25, roughness: .08, transmission: .28, transparent: true, opacity: .82, emissive: 0x170b4d, emissiveIntensity: 1.25, clearcoat: 1, clearcoatRoughness: .12 });
    const wire = new THREE.MeshBasicMaterial({ color: 0x6cf0ff, wireframe: true, transparent: true, opacity: .42, blending: THREE.AdditiveBlending });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 2), glass);
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.78, 1), wire); core.rotation.set(.42, .1, .2); shell.rotation.set(-.1, .2, -.15); root.add(core, shell);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xff55df, transparent: true, opacity: .6, blending: THREE.AdditiveBlending });
    const rings = [2.05, 2.42, 2.82].map((radius, index) => { const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, .012 + index * .004, 8, 180), ringMaterial); ring.rotation.set(Math.PI / 2 + index * .42, index * .22, index * .55); root.add(ring); return ring; });
    const shardMaterial = new THREE.MeshPhysicalMaterial({ color: 0x8eeeff, emissive: 0x163a66, emissiveIntensity: 1.2, metalness: .45, roughness: .12, transparent: true, opacity: .76 });
    const shards = [];
    for (let i = 0; i < 18; i++) { const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(.11 + (i % 4) * .035, 0), shardMaterial); const angle = i / 18 * Math.PI * 2; const radius = 2.15 + (i % 3) * .52; shard.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.7) * 1.45, Math.sin(angle) * radius * .5); shard.scale.y = 2.5 + (i % 4) * .55; root.add(shard); shards.push(shard); }
    const positions = new Float32Array(650 * 3);
    for (let i = 0; i < 650; i++) { const radius = 3 + Math.random() * 8; const angle = Math.random() * Math.PI * 2; positions[i * 3] = Math.cos(angle) * radius; positions[i * 3 + 1] = (Math.random() - .5) * 7; positions[i * 3 + 2] = Math.sin(angle) * radius - 3; }
    const pointsGeometry = new THREE.BufferGeometry(); pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(pointsGeometry, new THREE.PointsMaterial({ color: 0x7defff, size: .025, transparent: true, opacity: .64, blending: THREE.AdditiveBlending })); scene.add(points);
    const grid = new THREE.GridHelper(18, 36, 0x6d46ff, 0x14345c); grid.position.set(0, -2.85, -1.8); grid.material.transparent = true; grid.material.opacity = .28; scene.add(grid);
    const pointer = new THREE.Vector2();
    addEventListener("pointermove", event => { pointer.x = event.clientX / innerWidth - .5; pointer.y = event.clientY / innerHeight - .5; }, { passive: true });
    const resize = () => { const rect = canvas.getBoundingClientRect(); const width = Math.max(rect.width, 1); const height = Math.max(rect.height, 1); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); };
    new ResizeObserver(resize).observe(canvas); resize();
    const clock = new THREE.Clock();
    const draw = () => { const time = clock.getElapsedTime(); root.rotation.y += (pointer.x * .36 - root.rotation.y) * .025; root.rotation.x += (-pointer.y * .24 - root.rotation.x) * .025;
      if (motionActive) { core.rotation.x += .0025; core.rotation.y += .0035; shell.rotation.y -= .0019; shell.rotation.z += .0012; rings.forEach((ring, i) => { ring.rotation.z += .0014 * (i % 2 ? -1 : 1); ring.rotation.y += .0008 * (i + 1); }); shards.forEach((shard, i) => { shard.rotation.x += .006 + i * .00008; shard.rotation.y -= .004; shard.position.y += Math.sin(time * .8 + i) * .0009; }); points.rotation.y = time * .014; grid.position.z = (time * .28 % 1) - 2.2; }
      camera.position.x += (pointer.x * .35 - camera.position.x) * .018; camera.position.y += (-pointer.y * .28 - camera.position.y) * .018; camera.lookAt(.7, 0, 0); renderer.render(scene, camera); requestAnimationFrame(draw); };
    draw();
  } catch {
    canvas.hidden = true;
  }
}

function boot() {
  document.documentElement.classList.add("reveal-active");
  setupMotion();
  setupPdf();
  renderProfile(fallbackProfile);
  observeReveals();
  initThreeScene();
  loadProfile();
}

boot();
