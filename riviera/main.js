// Demo-only admin password for the client-side admin view. Set your own before deploying.
const ADMIN_PASSWORD = "change-me";

/*
 * "Ishaan & Anaya" placeholder wedding invitation template.
 * Mediterranean / lake-villa variant with a four-event celebration flow.
 *
 * EVENTS is the single source of truth for every celebration. Event Details,
 * the Ceremony Timeline, the Location cards/maps, the Countdown selector,
 * the scratch-card reveal date, and the calendar buttons are all generated
 * from this array at load time - edit the array below to customize this
 * card for a real client, no HTML edits required for those sections.
 */

const COUPLE_NAME = "Ishaan & Anaya";

// Replace the placeholder venue/date fields below with the real client's details.
// dateISO values are parsed as the guest's local browser time (no UTC offset is
// applied). If the venue is in a specific timezone and you want every guest to
// see the same countdown regardless of where they are viewing from, append an
// explicit offset, e.g. "2026-11-14T16:30:00+00:00".
const EVENTS = [
  {
    key: "pre-wedding",
    name: "Pre-Wedding Event",
    dateISO: "2026-11-12T18:00:00",
    timeLabel: "6:00 PM",
    venueName: "Grand Palace Hall, City Centre, London",
    venueAddress: "12 Grand Palace Road, City Centre, London",
    mapQuery: "Grand Palace Hall City Centre London",
    timelineLabel: "Pre-Wedding Celebration",
    description: "An evening of music, mehndi, and joyful beginnings with close family and friends.",
    note: "Come dance with us"
  },
  {
    key: "guest-arrival",
    name: "Guest Arrival",
    dateISO: "2026-11-14T14:00:00",
    timeLabel: "2:00 PM",
    venueName: "Grand Palace Hall, City Centre, London",
    venueAddress: "12 Grand Palace Road, City Centre, London",
    mapQuery: "Grand Palace Hall City Centre London",
    timelineLabel: "Guest Arrival",
    description: "Guests are welcomed with refreshments as we prepare for the ceremony.",
    note: "We welcome you"
  },
  {
    key: "wedding-ceremony",
    name: "Wedding Ceremony",
    dateISO: "2026-11-14T16:30:00",
    timeLabel: "4:30 PM",
    venueName: "Grand Palace Hall, City Centre, London",
    venueAddress: "12 Grand Palace Road, City Centre, London",
    mapQuery: "Grand Palace Hall City Centre London",
    timelineLabel: "Wedding Ceremony",
    description: "The vows are exchanged as two families become one.",
    note: "Your presence means a lot"
  },
  {
    key: "reception",
    name: "Reception",
    dateISO: "2026-11-14T19:30:00",
    timeLabel: "7:30 PM",
    venueName: "Grand Palace Hall, City Centre, London",
    venueAddress: "12 Grand Palace Road, City Centre, London",
    mapQuery: "Grand Palace Hall City Centre London",
    timelineLabel: "Reception Dinner",
    description: "An evening of dinner, dancing, and celebration with the newlyweds.",
    note: "Let's celebrate together"
  }
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

function formatEventDateLong(date) {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function formatEventDateWeekday(date) {
  return `${WEEKDAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function getSortedEvents() {
  return [...EVENTS].sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
}

function getDefaultEventIndex() {
  const now = Date.now();
  const idx = EVENTS.findIndex((ev) => new Date(ev.dateISO).getTime() > now);
  return idx === -1 ? EVENTS.length - 1 : idx;
}

let selectedEventIndex = getDefaultEventIndex();

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const openingDoors = document.getElementById("openingDoors");
const openDoorsBtn = document.getElementById("openDoors");
const doorsInviteText = document.getElementById("doorsInviteText");
const bgMusic = document.getElementById("bgMusic");
const musicToggle = document.getElementById("musicToggle");
const musicText = document.getElementById("musicText");
const musicPreferenceKey = "card3_music_enabled_v1";
const targetMusicVolume = 0.22;

let musicEnabled = true;
let musicIsPlaying = false;
let musicFadeFrame = 0;
let musicPauseTimeout = 0;
let isAdmin = false;

const countdownEls = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds")
};

const countdownMessage = document.getElementById("countdownMessage");
const countdownTabsContainer = document.getElementById("countdownTabs");
const countdownTargetLabel = document.getElementById("countdownTargetLabel");
const nav = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const navAnchors = navLinks ? navLinks.querySelectorAll("a") : [];
const scrollProgress = document.getElementById("scrollProgress");
const hero = document.querySelector(".hero");

const scratchCard = document.getElementById("scratchCard");
const scratchStage = document.getElementById("scratchStage");
const scratchCanvas = document.getElementById("scratchCanvas");
const scratchHint = document.getElementById("scratchHint");
const scratchSkip = document.getElementById("scratchSkip");
const scratchDateText = document.getElementById("scratchDateText");

const toTopBtn = document.getElementById("toTopBtn");
const celebrationLayer = document.getElementById("celebrationLayer");

const messageForm = document.getElementById("messageForm");
const messageGrid = document.getElementById("messageGrid");
const messageFeedback = document.getElementById("messageFeedback");

const messagesStorageKey = "card3_messages_v1";
const messagesRefreshIntervalMs = 20000;
let messagesRefreshTimerId = 0;
const defaultMessages = [];

/* -------------------------------------------------------------------------
 * Multi-event rendering: Event Details, Ceremony Timeline, Location cards,
 * Countdown selector, and the scratch-card date are all generated here from
 * the EVENTS array above.
 * ---------------------------------------------------------------------- */

function renderEventCards() {
  const container = document.getElementById("eventCards");
  if (!container) {
    return;
  }

  container.innerHTML = EVENTS.map((ev) => {
    const eventDate = new Date(ev.dateISO);
    return `
      <article class="event-card reveal">
        <h3>${ev.name}</h3>
        <ul>
          <li><strong>Date:</strong> ${formatEventDateWeekday(eventDate)}</li>
          <li><strong>Time:</strong> ${ev.timeLabel}</li>
          <li><strong>Venue:</strong> ${ev.venueName}</li>
        </ul>
        <button class="btn btn-calendar" data-event="${ev.key}" type="button">Add to Calendar</button>
      </article>
    `;
  }).join("");
}

function renderCeremonyTimeline() {
  const container = document.getElementById("ceremonyTimeline");
  if (!container) {
    return;
  }

  container.innerHTML = getSortedEvents().map((ev) => {
    const eventDate = new Date(ev.dateISO);
    return `
      <article class="timeline-item reveal">
        <span class="timeline-dot" aria-hidden="true"></span>
        <div class="timeline-content">
          <p class="timeline-time">${ev.timeLabel}</p>
          <h3>${ev.timelineLabel}</h3>
          <p class="timeline-date">${formatEventDateWeekday(eventDate)}</p>
          <p>${ev.description}</p>
          ${ev.note ? `<p class="timeline-note">${ev.note}</p>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function getUniqueVenues() {
  const venues = [];
  EVENTS.forEach((ev) => {
    let venue = venues.find((v) => v.venueName === ev.venueName);
    if (!venue) {
      venue = {
        venueName: ev.venueName,
        venueAddress: ev.venueAddress,
        mapQuery: ev.mapQuery,
        eventNames: []
      };
      venues.push(venue);
    }
    venue.eventNames.push(ev.name);
  });
  return venues;
}

function renderLocations() {
  const container = document.getElementById("locationList");
  if (!container) {
    return;
  }

  const venues = getUniqueVenues();

  container.innerHTML = venues.map((venue) => {
    const query = encodeURIComponent(venue.mapQuery);
    const noteText = `Venue for: ${venue.eventNames.join(", ")}`;

    return `
      <div class="location-layout">
        <article class="location-card reveal">
          <h3>${venue.venueName}</h3>
          <p class="location-venue-note">${noteText}</p>
          <p>${venue.venueAddress}</p>
          <a
            class="btn btn-primary"
            href="https://www.google.com/maps/search/?api=1&query=${query}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Google Maps
          </a>
        </article>
        <div class="map-wrap reveal">
          <iframe
            src="https://www.google.com/maps?q=${query}&output=embed"
            title="Google map showing ${venue.venueName}"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>
    `;
  }).join("");
}

function renderScratchDate() {
  if (!scratchDateText) {
    return;
  }
  const earliest = getSortedEvents()[0];
  if (!earliest) {
    return;
  }
  scratchDateText.textContent = formatEventDateLong(new Date(earliest.dateISO));
}

function updateCountdownTargetLabel() {
  if (!countdownTargetLabel) {
    return;
  }
  const currentEvent = EVENTS[selectedEventIndex];
  if (!currentEvent) {
    return;
  }
  countdownTargetLabel.textContent =
    `Counting down to ${currentEvent.name} — ${formatEventDateWeekday(new Date(currentEvent.dateISO))}`;
}

function renderCountdownTabs() {
  if (!countdownTabsContainer) {
    return;
  }

  countdownTabsContainer.innerHTML = EVENTS.map((ev, index) => `
    <button
      type="button"
      class="${index === selectedEventIndex ? "active" : ""}"
      data-index="${index}"
      role="tab"
      aria-selected="${index === selectedEventIndex}"
    >${ev.name}</button>
  `).join("");

  countdownTabsContainer.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedEventIndex = Number.parseInt(btn.dataset.index, 10);
      countdownTabsContainer.querySelectorAll("button").forEach((otherBtn) => {
        const isActive = otherBtn === btn;
        otherBtn.classList.toggle("active", isActive);
        otherBtn.setAttribute("aria-selected", String(isActive));
      });
      updateCountdownTargetLabel();
      updateCountdown();
    });
  });
}

function loadMusicPreference() {
  try {
    return localStorage.getItem(musicPreferenceKey) !== "off";
  } catch (_error) {
    return true;
  }
}

function saveMusicPreference(enabled) {
  try {
    localStorage.setItem(musicPreferenceKey, enabled ? "on" : "off");
  } catch (_error) {
    // Ignore storage failures and keep runtime preference only.
  }
}

function updateMusicUI() {
  if (!musicToggle || !musicText) {
    return;
  }

  const isPlaying = musicEnabled && musicIsPlaying;
  musicToggle.classList.toggle("is-playing", isPlaying);
  musicToggle.setAttribute("aria-pressed", String(isPlaying));
  musicText.textContent = isPlaying ? "Music On" : "Music Off";
}

function fadeMusicVolume(target, duration = 650) {
  if (!bgMusic) {
    return;
  }

  if (musicFadeFrame) {
    cancelAnimationFrame(musicFadeFrame);
  }

  const startVolume = Number.isFinite(bgMusic.volume) ? bgMusic.volume : 0;
  const startedAt = performance.now();

  function step(now) {
    const elapsed = now - startedAt;
    const progress = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    bgMusic.volume = startVolume + (target - startVolume) * eased;
    if (progress < 1) {
      musicFadeFrame = requestAnimationFrame(step);
    } else {
      musicFadeFrame = 0;
    }
  }

  musicFadeFrame = requestAnimationFrame(step);
}

async function playBackgroundMusic(fromUserAction = false) {
  if (!bgMusic || !musicEnabled) {
    return;
  }

  if (musicPauseTimeout) {
    window.clearTimeout(musicPauseTimeout);
    musicPauseTimeout = 0;
  }

  try {
    if (bgMusic.paused) {
      bgMusic.volume = 0;
      if (fromUserAction) {
        await bgMusic.play();
      } else {
        const playAttempt = bgMusic.play();
        if (playAttempt) {
          await playAttempt;
        }
      }
    }
    musicIsPlaying = true;
    updateMusicUI();
    fadeMusicVolume(targetMusicVolume, 850);
  } catch (_error) {
    musicIsPlaying = false;
    updateMusicUI();
  }
}

function pauseBackgroundMusic() {
  if (!bgMusic) {
    return;
  }

  if (musicPauseTimeout) {
    window.clearTimeout(musicPauseTimeout);
  }

  const finalizePause = () => {
    bgMusic.pause();
    bgMusic.volume = 0;
    musicIsPlaying = false;
    updateMusicUI();
    musicPauseTimeout = 0;
  };

  fadeMusicVolume(0, 420);
  musicPauseTimeout = window.setTimeout(finalizePause, 430);
}

function requestMusicStart(fromUserAction = false) {
  if (!musicEnabled) {
    return;
  }
  playBackgroundMusic(fromUserAction);
}

function initBackgroundMusic() {
  musicEnabled = loadMusicPreference();

  if (bgMusic) {
    bgMusic.volume = 0;
    bgMusic.preload = "auto";
  }

  updateMusicUI();

  if (!musicToggle) {
    return;
  }

  musicToggle.addEventListener("click", () => {
    if (musicIsPlaying) {
      musicEnabled = false;
      saveMusicPreference(false);
      pauseBackgroundMusic();
      return;
    }

    musicEnabled = true;
    saveMusicPreference(true);
    playBackgroundMusic(true);
  });
}

/* -------------------------------------------------------------------------
 * Opening doors: a re-themed adaptation of the classic "opening envelope"
 * intro mechanic - two teal double-doors that unlatch and swing open on
 * click/tap/keypress, fading into the hero beneath. Same click-to-open
 * pattern and body-class-toggling/transition-timing approach, just renamed
 * end-to-end for a doors metaphor instead of an envelope.
 * ---------------------------------------------------------------------- */

function initOpeningDoors() {
  if (!openingDoors) {
    document.body.classList.remove("doors-active");
    return;
  }

  document.body.classList.add("doors-active");

  let doorsState = "idle";
  const revealDelay = reducedMotionQuery.matches ? 140 : 1450;
  const unlatchPause = reducedMotionQuery.matches ? 180 : 900;
  let wobbleTimeout = 0;
  let wobbleResetTimeout = 0;

  function setHandlePressed(isPressed) {
    if (!openDoorsBtn || doorsState === "opening" || doorsState === "opened") {
      return;
    }

    openDoorsBtn.classList.toggle("is-pressed", isPressed);
  }

  function onDoorsKeydown(event) {
    if (event.key === "Enter" || event.key === " " || event.key === "Escape") {
      event.preventDefault();
      triggerDoorsOpen();
    }
  }

  function unlatchDoors() {
    if (doorsState !== "idle") {
      return;
    }

    doorsState = "unlatched";
    openingDoors.classList.add("handle-unlatched");
    if (doorsInviteText) {
      doorsInviteText.textContent = "You're Invited";
    }
    if (navigator.vibrate) {
      navigator.vibrate(18);
    }
  }

  function openDoors() {
    if (doorsState === "opening" || doorsState === "opened") {
      return;
    }

    if (doorsState === "idle") {
      unlatchDoors();
      window.setTimeout(openDoors, unlatchPause);
      return;
    }

    doorsState = "opening";
    if (wobbleTimeout) {
      window.clearTimeout(wobbleTimeout);
      wobbleTimeout = 0;
    }
    if (wobbleResetTimeout) {
      window.clearTimeout(wobbleResetTimeout);
      wobbleResetTimeout = 0;
    }
    openingDoors.classList.add("opening");
    openingDoors.classList.remove("door-wobble");
    wobbleTimeout = window.setTimeout(() => {
      if (doorsState !== "opening") {
        return;
      }

      openingDoors.classList.add("door-wobble");
      wobbleResetTimeout = window.setTimeout(() => {
        openingDoors.classList.remove("door-wobble");
      }, reducedMotionQuery.matches ? 110 : 760);
    }, reducedMotionQuery.matches ? 0 : 150);
    if (doorsInviteText) {
      doorsInviteText.textContent = "Opening your invitation...";
    }
    window.setTimeout(() => {
      openingDoors.classList.add("closed");
      openingDoors.classList.remove("door-wobble");
      document.body.classList.remove("doors-active");
      doorsState = "opened";
      updateScrollEffects();
    }, revealDelay);
    document.removeEventListener("keydown", onDoorsKeydown);
  }

  function triggerDoorsOpen() {
    setHandlePressed(false);
    requestMusicStart(true);
    if (doorsState === "idle") {
      unlatchDoors();
      window.setTimeout(openDoors, unlatchPause);
      return;
    }
    openDoors();
  }

  if (openDoorsBtn) {
    openDoorsBtn.addEventListener("click", triggerDoorsOpen);
    openDoorsBtn.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }
      setHandlePressed(true);
    });
    openDoorsBtn.addEventListener("pointerup", () => setHandlePressed(false));
    openDoorsBtn.addEventListener("pointerleave", () => setHandlePressed(false));
    openDoorsBtn.addEventListener("pointercancel", () => setHandlePressed(false));
    openDoorsBtn.addEventListener("blur", () => setHandlePressed(false));
  }

  openingDoors.addEventListener("click", (event) => {
    if (event.target === openingDoors) {
      triggerDoorsOpen();
    }
  });

  document.addEventListener("keydown", onDoorsKeydown);
}

function initRevealStagger() {
  const sections = document.querySelectorAll("main section");
  sections.forEach((section) => {
    const revealEls = section.querySelectorAll(".reveal");
    revealEls.forEach((element, index) => {
      const delay = Math.min(index * 85, 425);
      element.style.transitionDelay = `${delay}ms`;
    });
  });
}

function launchCelebrationBurst(sourceElement, count = 18) {
  if (!celebrationLayer || reducedMotionQuery.matches) {
    return;
  }

  const rect = sourceElement
    ? sourceElement.getBoundingClientRect()
    : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  const baseX = rect.left + rect.width / 2;
  const baseY = rect.top + rect.height / 2;

  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("span");
    const isHeart = Math.random() > 0.64;
    particle.className = `burst-particle${isHeart ? " heart" : ""}`;

    const startX = baseX + (Math.random() - 0.5) * 42;
    const startY = baseY + (Math.random() - 0.5) * 18;
    const dx = (Math.random() - 0.5) * 200;
    const dy = -30 - Math.random() * 170;
    const duration = 680 + Math.random() * 400;

    particle.style.setProperty("--x", `${startX}px`);
    particle.style.setProperty("--y", `${startY}px`);
    particle.style.setProperty("--dx", `${dx}px`);
    particle.style.setProperty("--dy", `${dy}px`);
    particle.style.animationDuration = `${duration}ms`;
    particle.style.animationDelay = `${Math.random() * 120}ms`;

    celebrationLayer.appendChild(particle);
    particle.addEventListener("animationend", () => {
      particle.remove();
    });
  }
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function setCountdownValues(days, hours, minutes, seconds) {
  countdownEls.days.textContent = days;
  countdownEls.hours.textContent = padNumber(hours);
  countdownEls.minutes.textContent = padNumber(minutes);
  countdownEls.seconds.textContent = padNumber(seconds);
}

function updateCountdown() {
  const currentEvent = EVENTS[selectedEventIndex] || EVENTS[0];
  if (!currentEvent) {
    return;
  }

  const targetDate = new Date(currentEvent.dateISO);
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) {
    setCountdownValues(0, 0, 0, 0);
    countdownMessage.textContent = `${currentEvent.name} has arrived. Celebrate with us!`;
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  setCountdownValues(days, hours, minutes, seconds);
  countdownMessage.textContent = "";
}

function updateScrollEffects() {
  const scrollTop = window.scrollY;

  if (nav) {
    nav.classList.toggle("scrolled", scrollTop > 16);
  }

  if (scrollProgress) {
    const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = pageHeight > 0 ? Math.min(100, (scrollTop / pageHeight) * 100) : 0;
    scrollProgress.style.width = `${progress}%`;
  }

  if (hero && !reducedMotionQuery.matches) {
    const offset = Math.min(scrollTop * 0.12, 120);
    hero.style.backgroundPosition = `center calc(50% + ${offset}px)`;
  }

  if (toTopBtn) {
    toTopBtn.classList.toggle("visible", scrollTop > 620);
  }
}

function initHeroSpotlight() {
  if (!hero || reducedMotionQuery.matches) {
    return;
  }

  function updateHeroGlow(clientX, clientY) {
    const rect = hero.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    hero.style.setProperty("--hero-mx", `${Math.max(0, Math.min(100, x))}%`);
    hero.style.setProperty("--hero-my", `${Math.max(0, Math.min(100, y))}%`);
  }

  hero.addEventListener("pointermove", (event) => {
    updateHeroGlow(event.clientX, event.clientY);
  });

  hero.addEventListener("pointerleave", () => {
    hero.style.setProperty("--hero-mx", "50%");
    hero.style.setProperty("--hero-my", "46%");
  });
}

function initNavMenu() {
  if (!navToggle || !navLinks) {
    return;
  }

  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

function setActiveNavLink(activeId) {
  navAnchors.forEach((anchor) => {
    const sectionId = anchor.getAttribute("href").replace("#", "");
    anchor.classList.toggle("active", sectionId === activeId);
  });
}

function initActiveNavTracking() {
  const sections = document.querySelectorAll("main section[id]");
  if (!sections.length || !navAnchors.length) {
    return;
  }

  setActiveNavLink("home");

  if (!("IntersectionObserver" in window)) {
    return;
  }

  let current = "home";
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          current = entry.target.id;
        }
      });
      setActiveNavLink(current);
    },
    {
      rootMargin: "-38% 0px -50% 0px",
      threshold: 0.01
    }
  );

  sections.forEach((section) => observer.observe(section));
}

/* -------------------------------------------------------------------------
 * Scratch-to-reveal: identical scratch mechanic to the base template, but
 * reskinned with a heart-shaped clip (applied in CSS via #heartClipPath on
 * both .scratch-stage and .scratch-canvas) and a blue glitter/sparkle cover
 * instead of gold foil.
 * ---------------------------------------------------------------------- */

function initScratchReveal() {
  if (!scratchCard || !scratchStage || !scratchCanvas || !scratchHint || !scratchSkip) {
    return;
  }

  const ctx = scratchCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    const earliest = getSortedEvents()[0];
    scratchHint.textContent = earliest
      ? `Our celebrations begin ${formatEventDateLong(new Date(earliest.dateISO))}`
      : "Scratch the heart to reveal when our celebrations begin";
    return;
  }

  let isDrawing = false;
  let revealed = false;
  let dpr = 1;
  let moveCount = 0;

  function drawCover(width, height) {
    ctx.globalCompositeOperation = "source-over";

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#eaf6fb");
    gradient.addColorStop(0.28, "#bfe3f2");
    gradient.addColorStop(0.55, "#7fb8d9");
    gradient.addColorStop(0.8, "#4f9dc4");
    gradient.addColorStop(1, "#2f6f96");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Blue glitter/sparkle flecks scattered across the cover.
    ctx.save();
    for (let index = 0; index < 60; index += 1) {
      const px = Math.random() * width;
      const py = Math.random() * height;
      const radius = 0.6 + Math.random() * 1.8;
      ctx.beginPath();
      ctx.fillStyle = index % 3 === 0 ? "rgba(255, 255, 255, 0.92)" : "rgba(214, 241, 255, 0.65)";
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const sheen = ctx.createLinearGradient(0, 0, 0, height);
    sheen.addColorStop(0, "rgba(255, 255, 255, 0.4)");
    sheen.addColorStop(0.45, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${Math.max(14, width * 0.095)}px "Cormorant Garamond", serif`;
    ctx.shadowColor = "rgba(15, 35, 45, 0.35)";
    ctx.shadowBlur = Math.max(6, width * 0.02);
    ctx.fillText("Scratch to Reveal", width / 2, height * 0.46);
    ctx.restore();
  }

  function setupCanvas() {
    if (revealed) {
      return;
    }

    const rect = scratchStage.getBoundingClientRect();
    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    scratchCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
    scratchCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
    scratchCanvas.style.width = `${rect.width}px`;
    scratchCanvas.style.height = `${rect.height}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCover(rect.width, rect.height);
  }

  function positionFromEvent(event) {
    const rect = scratchCanvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function scratchAt(x, y) {
    const radius = Math.max(18, Math.min(30, scratchCanvas.clientWidth * 0.11));
    const gradient = ctx.createRadialGradient(x, y, 2, x, y, radius);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.95)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function clearedRatio() {
    const pixels = ctx.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height).data;
    let transparentPixels = 0;
    let sampledPixels = 0;

    for (let i = 3; i < pixels.length; i += 4 * 12) {
      sampledPixels += 1;
      if (pixels[i] < 70) {
        transparentPixels += 1;
      }
    }

    return sampledPixels ? transparentPixels / sampledPixels : 0;
  }

  function revealScratch() {
    if (revealed) {
      return;
    }

    revealed = true;
    scratchCard.classList.add("is-revealed");
    if (scratchHint) scratchHint.textContent = "Date revealed! We can't wait to celebrate with you.";
    if (scratchSkip) {
      scratchSkip.textContent = "Revealed";
      scratchSkip.disabled = true;
    }
    ctx.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
    launchCelebrationBurst(scratchStage, 22);
  }

  function maybeReveal() {
    if (clearedRatio() > 0.48) {
      revealScratch();
    }
  }

  function onPointerDown(event) {
    if (revealed || event.button === 2) {
      return;
    }

    isDrawing = true;
    moveCount = 0;
    scratchCanvas.setPointerCapture(event.pointerId);
    const pos = positionFromEvent(event);
    scratchAt(pos.x, pos.y);
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!isDrawing || revealed) {
      return;
    }

    const pos = positionFromEvent(event);
    scratchAt(pos.x, pos.y);
    moveCount += 1;

    if (moveCount % 12 === 0) {
      maybeReveal();
    }
  }

  function onPointerEnd(event) {
    if (!isDrawing) {
      return;
    }
    isDrawing = false;
    try {
      scratchCanvas.releasePointerCapture(event.pointerId);
    } catch (_error) {
      // Ignore if capture was already released by the browser.
    }
    maybeReveal();
  }

  setupCanvas();
  scratchCanvas.addEventListener("pointerdown", onPointerDown);
  scratchCanvas.addEventListener("pointermove", onPointerMove);
  scratchCanvas.addEventListener("pointerup", onPointerEnd);
  scratchCanvas.addEventListener("pointercancel", onPointerEnd);
  scratchCanvas.addEventListener("pointerleave", () => {
    if (isDrawing) {
      maybeReveal();
    }
  });

  scratchSkip.addEventListener("click", revealScratch);
  window.addEventListener("resize", setupCanvas);
}

function initRevealAnimations() {
  const revealEls = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -20px 0px"
    }
  );

  revealEls.forEach((el) => observer.observe(el));
}

function normalizePhone(value) {
  return value.replace(/[^\d+]/g, "");
}

/**
 * Retries an async function multiple times with a delay.
 */
async function withRetry(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 1.5);
  }
}

const FAILSAFE_STORAGE_KEY = "card3_data_failsafe_v1";

/**
 * Saves a failed submission to local storage to be retried later.
 */
function saveToFailsafeBackup(type, payload) {
  try {
    const backupStr = localStorage.getItem(FAILSAFE_STORAGE_KEY) || "[]";
    const backups = JSON.parse(backupStr);

    // Don't save duplicates (simple check based on payload content)
    const payloadStr = JSON.stringify(payload);
    if (backups.some(b => JSON.stringify(b.payload) === payloadStr)) return;

    backups.push({
      type,
      payload,
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(FAILSAFE_STORAGE_KEY, JSON.stringify(backups));
    console.warn(`Data saved to failsafe backup (${type})`);
  } catch (e) {
    console.error("Critical: Could not save failsafe backup", e);
  }
}

/**
 * Attempts to re-sync any backed-up data on page load.
 */
async function processFailsafeBackups() {
  const backupStr = localStorage.getItem(FAILSAFE_STORAGE_KEY);
  if (!backupStr) return;

  try {
    const backups = JSON.parse(backupStr);
    if (backups.length === 0) return;

    console.log(`Processing ${backups.length} failsafe backups...`);
    const remaining = [];

    for (const item of backups) {
      try {
        if (item.type === "message") {
          await submitSharedMessage(item.payload);
        }
        console.log(`Successfully synced backed-up ${item.type} data.`);
      } catch (e) {
        console.warn(`Re-sync failed for ${item.type}, keeping in backup.`, e);
        remaining.push(item);
      }
    }

    if (remaining.length > 0) {
      localStorage.setItem(FAILSAFE_STORAGE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(FAILSAFE_STORAGE_KEY);
    }
  } catch (e) {
    console.error("Failsafe process error", e);
  }
}

function getFormEndpoint(formElement, placeholderToken = "") {
  if (!formElement) {
    return "";
  }

  const explicitEndpoint = (formElement.dataset.endpoint || "").trim();
  if (explicitEndpoint) {
    return explicitEndpoint;
  }

  const actionEndpoint = (formElement.getAttribute("action") || "").trim();
  if (!actionEndpoint) {
    return "";
  }

  if (placeholderToken && actionEndpoint.includes(placeholderToken)) {
    return "";
  }

  return actionEndpoint;
}

function getMessageEndpoint() {
  return getFormEndpoint(messageForm, "YOUR_FORMSPREE_MESSAGE_ENDPOINT");
}

function getDataAttributeValue(element, datasetKey, attributeName) {
  if (!element) {
    return "";
  }

  const fromDataset =
    element.dataset && typeof element.dataset[datasetKey] === "string" ? element.dataset[datasetKey] : "";
  const fromAttribute = element.getAttribute(attributeName) || "";
  return (fromDataset || fromAttribute || "").trim();
}

function getMessageSyncConfig() {
  if (!messageForm) {
    return null;
  }

  const syncUrl = getDataAttributeValue(messageForm, "syncUrl", "data-sync-url").replace(/\/+$/, "");
  const syncKey = getDataAttributeValue(messageForm, "syncKey", "data-sync-key");
  const syncTable = getDataAttributeValue(messageForm, "syncTable", "data-sync-table") || "card3_messages";

  if (!syncUrl || !syncKey || !syncTable || syncUrl.includes("YOUR_SUPABASE_PROJECT_URL") || syncKey.includes("YOUR_SUPABASE_ANON_KEY")) {
    return null;
  }

  return { syncUrl, syncKey, syncTable };
}

function buildSupabaseHeaders(syncKey, includeJson = false) {
  const headers = {
    apikey: syncKey,
    Authorization: `Bearer ${syncKey}`
  };

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

function buildFormPayload(data) {
  const payload = new FormData();
  data.forEach((value, key) => {
    payload.append(key, typeof value === "string" ? value.trim() : value);
  });
  return payload;
}

async function parseApiError(response) {
  const responseType = (response.headers.get("content-type") || "").toLowerCase();
  if (!responseType.includes("application/json")) {
    return "";
  }

  try {
    const payload = await response.json();

    if (payload && Array.isArray(payload.errors)) {
      return payload.errors
        .map((item) => item.message)
        .filter((message) => typeof message === "string" && message.trim())
        .join(" ");
    }

    if (payload && typeof payload.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }

    if (payload && typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }

    return "";
  } catch (_error) {
    return "";
  }
}

async function parseSubmissionError(response) {
  return parseApiError(response);
}

function escapeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

/* -------------------------------------------------------------------------
 * Send a Message: replaces the old separate RSVP form and Blessings Wall
 * with one combined form (name, email, attending, message) that writes a
 * single row to the card3_messages Supabase table, with a Formspree email
 * notification as a secondary channel and a local failsafe backup if the
 * network request fails. Below the form, a live list of submitted messages
 * refreshes on the same interval/diff pattern the old blessings grid used.
 * ---------------------------------------------------------------------- */

function setMessageFeedback(message, type) {
  if (!messageFeedback) {
    return;
  }

  messageFeedback.textContent = message;
  messageFeedback.classList.remove("error", "success");
  if (type) {
    messageFeedback.classList.add(type);
  }
}

function validateMessageForm(data) {
  const errors = [];

  const name = String(data.get("messageName") || "").trim();
  const email = String(data.get("messageEmail") || "").trim();
  const attending = String(data.get("messageAttending") || "").trim();
  const messageBody = String(data.get("messageBody") || "").trim();

  if (name.length < 2) {
    errors.push("Please enter your name.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Please enter a valid email address.");
  }

  if (attending !== "yes" && attending !== "no") {
    errors.push("Please let us know whether you'll be attending.");
  }

  if (messageBody.length < 8) {
    errors.push("Please write a slightly longer message.");
  }

  return errors;
}

async function submitMessageData(data) {
  const endpoint = getMessageEndpoint();
  if (!endpoint) {
    throw new Error("Message endpoint is not configured.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json"
    },
    body: buildFormPayload(data)
  });

  const errorMessage = await parseSubmissionError(response);

  if (!response.ok) {
    throw new Error(errorMessage || `Message submission failed with status ${response.status}.`);
  }
}

async function submitSharedMessage(entry) {
  const syncConfig = getMessageSyncConfig();
  if (!syncConfig) {
    return false;
  }

  const payload = {
    name: entry.name,
    email: entry.email,
    attending: entry.attending,
    message: entry.message
  };

  const response = await fetch(`${syncConfig.syncUrl}/rest/v1/${syncConfig.syncTable}`, {
    method: "POST",
    headers: {
      ...buildSupabaseHeaders(syncConfig.syncKey, true),
      Prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(response);
    throw new Error(errorMessage || `Shared message save failed with status ${response.status}.`);
  }

  return true;
}

async function fetchSharedMessages() {
  const syncConfig = getMessageSyncConfig();
  if (!syncConfig) {
    return null;
  }

  const requestUrl =
    `${syncConfig.syncUrl}/rest/v1/${syncConfig.syncTable}` +
    "?select=id,name,email,attending,message,created_at&order=created_at.desc&limit=30";

  const response = await fetch(requestUrl, {
    headers: buildSupabaseHeaders(syncConfig.syncKey)
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(response);
    throw new Error(errorMessage || `Shared messages load failed with status ${response.status}.`);
  }

  const records = await response.json();
  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .filter((item) => item && typeof item.name === "string" && typeof item.message === "string")
    .map((item) => ({
      id: item.id || null,
      name: escapeText(item.name).slice(0, 50),
      email: escapeText(String(item.email || "")).slice(0, 80),
      attending: item.attending === "yes" ? "yes" : "no",
      message: escapeText(item.message).slice(0, 300),
      createdAt: item.created_at || ""
    }));
}

function getStoredMessages() {
  try {
    const stored = localStorage.getItem(messagesStorageKey);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed.filter((item) => item && typeof item.name === "string" && typeof item.message === "string");
  } catch (_error) {
    return null;
  }
}

function saveMessages(list) {
  try {
    localStorage.setItem(messagesStorageKey, JSON.stringify(list));
  } catch (_error) {
    // Ignore storage failures and keep functionality in-memory.
  }
}

function renderMessages(list) {
  if (!messageGrid) {
    return;
  }

  messageGrid.innerHTML = "";
  const entries = list.slice(0, 24);

  if (entries.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "message-empty";
    emptyState.textContent = "Be the first to leave a message for the couple.";
    messageGrid.appendChild(emptyState);
    return;
  }

  entries.forEach((entry, index) => {
    const card = document.createElement("article");
    card.className = `message-card theme-${(index % 3) + 1}`;

    const attendingBadge = document.createElement("span");
    attendingBadge.className = `message-attending-badge ${entry.attending === "yes" ? "is-yes" : "is-no"}`;
    attendingBadge.textContent = entry.attending === "yes" ? "Attending" : "Not attending";

    const messageText = document.createElement("p");
    messageText.textContent = entry.message;

    const author = document.createElement("footer");
    author.textContent = `- ${entry.name}`;

    card.appendChild(attendingBadge);
    card.appendChild(messageText);
    card.appendChild(author);

    if (isAdmin && entry.id) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.type = "button";
      deleteBtn.title = "Remove this message";
      deleteBtn.style.opacity = "1";
      deleteBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      `;
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        confirmMessageDeletion(entry.id);
      });
      card.appendChild(deleteBtn);
    }

    messageGrid.appendChild(card);
  });
}

async function confirmMessageDeletion(id) {
  if (!confirm("Are you sure you want to remove this message?")) {
    return;
  }

  try {
    const syncConfig = getMessageSyncConfig();
    if (!syncConfig) return;

    const dbUrl = `${syncConfig.syncUrl}/rest/v1/${syncConfig.syncTable}?id=eq.${id}`;
    await fetch(dbUrl, {
      method: "DELETE",
      headers: buildSupabaseHeaders(syncConfig.syncKey)
    });

    launchCelebrationBurst(messageGrid, 8);
    if (window.refreshSharedMessagesGlobal) {
      await window.refreshSharedMessagesGlobal(false, true);
    }

    if (typeof refreshAdminPanel === "function") {
      void refreshAdminPanel();
    }
  } catch (error) {
    console.error("Message deletion failed:", error);
    alert("Could not remove message. Check Supabase policies.");
  }
}

function initMessagesForm() {
  if (!messageForm || !messageGrid) {
    return;
  }

  const submitButton = messageForm.querySelector('button[type="submit"]');
  const submitButtonText = submitButton ? submitButton.textContent : "";
  const hasSharedSync = Boolean(getMessageSyncConfig());

  let messages = getStoredMessages();
  if (!messages || messages.length === 0) {
    messages = defaultMessages.slice();
    saveMessages(messages);
  }

  renderMessages(messages);

  async function refreshFromShared(showErrorFeedback = false, forceRender = false) {
    if (!hasSharedSync) {
      return;
    }

    try {
      const sharedMessages = await fetchSharedMessages();
      if (!Array.isArray(sharedMessages)) {
        return;
      }

      const nextMessages = sharedMessages.length > 0 ? sharedMessages.slice(0, 24) : defaultMessages.slice();
      const nextSerialized = JSON.stringify(nextMessages);
      const currentSerialized = JSON.stringify(messages);

      if (forceRender || nextSerialized !== currentSerialized) {
        messages = nextMessages;
        saveMessages(messages);
        renderMessages(messages);
      }

      if (showErrorFeedback) {
        setMessageFeedback("", "");
      }
    } catch (error) {
      console.error(error);
      if (showErrorFeedback) {
        setMessageFeedback(
          error instanceof Error && error.message
            ? error.message
            : "Could not load shared messages right now. Showing saved messages.",
          "error"
        );
      }
    }
  }

  if (hasSharedSync) {
    void refreshFromShared(true);

    if (messagesRefreshTimerId) {
      window.clearInterval(messagesRefreshTimerId);
      messagesRefreshTimerId = 0;
    }

    messagesRefreshTimerId = window.setInterval(() => {
      if (document.hidden) {
        return;
      }
      void refreshFromShared(false);
    }, messagesRefreshIntervalMs);
  }

  // Expose refresh function globally for the admin delete callback.
  window.refreshSharedMessagesGlobal = refreshFromShared;

  messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(messageForm);
    const errors = validateMessageForm(formData);

    if (errors.length > 0) {
      setMessageFeedback(errors[0], "error");
      return;
    }

    const newMessage = {
      name: escapeText(String(formData.get("messageName") || "")).slice(0, 50),
      email: escapeText(String(formData.get("messageEmail") || "")).slice(0, 80),
      attending: String(formData.get("messageAttending") || "").trim(),
      message: escapeText(String(formData.get("messageBody") || "")).slice(0, 300)
    };
    formData.set("messageName", newMessage.name);
    formData.set("messageEmail", newMessage.email);
    formData.set("messageBody", newMessage.message);

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }
    setMessageFeedback("", "");

    try {
      let supabaseSuccess = false;

      // 1. SYNC to Supabase (primary source of truth)
      if (hasSharedSync) {
        try {
          await withRetry(() => submitSharedMessage(newMessage), 3, 800);
          supabaseSuccess = true;
          if (!messages.some((m) => m.message === newMessage.message && m.name === newMessage.name)) {
            messages.unshift(newMessage);
            messages = messages.slice(0, 24);
            saveMessages(messages);
            renderMessages(messages);
          }
          void refreshFromShared(false);
        } catch (dbError) {
          console.error("Message database sync failed, queuing.", dbError);
          saveToFailsafeBackup("message", newMessage);
        }
      }

      // 2. SUBMIT to Formspree (email notification backup)
      try {
        await submitMessageData(formData);
      } catch (formError) {
        console.warn("Message email limit reached or failed.", formError);
        if (!supabaseSuccess) throw formError;
      }

      setMessageFeedback("Thank you! Your message has been sent successfully.", "success");
      launchCelebrationBurst(messageForm, 18);
      messageForm.reset();

      if (!hasSharedSync) {
        messages.unshift(newMessage);
        messages = messages.slice(0, 24);
        saveMessages(messages);
        renderMessages(messages);
      }
    } catch (error) {
      console.error("Message submission failure:", error);
      setMessageFeedback(
        error instanceof Error && error.message
          ? error.message
          : "We could not send your message right now. Please try again.",
        "error"
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButtonText || "Send Message";
      }
    }
  });
}

/* -------------------------------------------------------------------------
 * Admin panel: a single "Messages" tab (adapted from Card One's shared
 * fetch/render/delete pattern) instead of the old multi-tab layout that
 * used to cover RSVPs, blessings, and shared photo uploads.
 * ---------------------------------------------------------------------- */

async function refreshAdminPanel() {
  const messagesBody = document.getElementById("adminMessagesBody");
  if (!messagesBody) {
    return;
  }

  try {
    const messages = await fetchSharedMessages();
    const rows = Array.isArray(messages) ? messages : [];
    messagesBody.innerHTML = rows.map((m) => `
      <tr>
        <td>${escapeText(m.name)}</td>
        <td>${escapeText(m.email)}</td>
        <td>${m.attending === "yes" ? "✅ Yes" : "❌ No"}</td>
        <td>${escapeText(m.message)}</td>
        <td>${m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—"}</td>
        <td>
          <button class="admin-delete-btn" onclick="confirmMessageDeletion('${m.id}')">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </td>
      </tr>
    `).join("") || "<tr><td colspan='6'>No messages found.</td></tr>";
  } catch (error) {
    console.error("Admin Panel Refresh Error:", error);
    messagesBody.innerHTML = "<tr><td colspan='6'>Could not load messages.</td></tr>";
  }
}

// Expose actions to window for onclick handlers in template strings
window.confirmMessageDeletion = confirmMessageDeletion;

function initCardTilt() {
  if (reducedMotionQuery.matches || !window.matchMedia("(hover:hover) and (pointer:fine)").matches) {
    return;
  }

  const tiltCards = document.querySelectorAll(
    ".event-card, .dress-item, .count-card, .timeline-content, .location-card, .gifts-card, .message-card"
  );

  tiltCards.forEach((card) => {
    let frameId = 0;

    function setTilt(event) {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * 7;
      const rotateX = (0.5 - py) * 7;

      if (frameId) {
        cancelAnimationFrame(frameId);
      }

      frameId = requestAnimationFrame(() => {
        card.style.transform =
          `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) ` +
          `rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
      });
    }

    function resetTilt() {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      card.style.transform = "";
    }

    card.addEventListener("pointermove", setTilt);
    card.addEventListener("pointerleave", resetTilt);
    card.addEventListener("pointercancel", resetTilt);
  });
}

function initBackToTop() {
  if (!toTopBtn) {
    return;
  }

  toTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: reducedMotionQuery.matches ? "auto" : "smooth"
    });
  });
}

let scrollTicking = false;
function onScroll() {
  if (scrollTicking) {
    return;
  }

  scrollTicking = true;
  requestAnimationFrame(() => {
    updateScrollEffects();
    scrollTicking = false;
  });
}

function initGuestPersonalization() {
  const urlParams = new URLSearchParams(window.location.search);
  const guestName = urlParams.get("guest");
  const greetingEl = document.getElementById("guestGreeting");
  const nameEl = document.getElementById("guestName");

  if (guestName && greetingEl && nameEl) {
    nameEl.textContent = guestName;
    greetingEl.style.display = "block";
  }
}

function initCalendarButtons() {
  const calendarBtns = document.querySelectorAll(".btn-calendar");
  const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours, adjust per event if needed

  function toCalendarStamp(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  calendarBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const eventKey = btn.dataset.event;
      const eventInfo = EVENTS.find((ev) => ev.key === eventKey);
      if (!eventInfo) return;

      const startDate = new Date(eventInfo.dateISO);
      const endDate = new Date(startDate.getTime() + DEFAULT_DURATION_MS);
      const title = `${COUPLE_NAME} - ${eventInfo.name}`;
      const location = eventInfo.venueAddress || eventInfo.venueName || "";

      const url =
        `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}` +
        `&dates=${toCalendarStamp(startDate)}/${toCalendarStamp(endDate)}` +
        `&details=${encodeURIComponent(eventInfo.description || "")}&location=${encodeURIComponent(location)}`;
      const popup = window.open(url, "_blank", "noopener,noreferrer");
      if (popup) {
        popup.opener = null;
      }
    });
  });
}

function initAdminMode() {
  const adminBtn = document.getElementById("adminLoginBtn");
  if (!adminBtn) return;

  adminBtn.addEventListener("click", () => {
    const password = prompt("Enter Admin Password:");
    // TODO: change this placeholder password before handing this card to a real client.
    if (password === ADMIN_PASSWORD) {
      isAdmin = true;
      document.body.classList.add("is-admin");
      adminBtn.textContent = "Admin Mode Active";
      adminBtn.disabled = true;
      adminBtn.style.textDecoration = "none";
      adminBtn.style.opacity = "1";

      void refreshAdminPanel();

      // Re-render messages to show delete buttons
      if (window.refreshSharedMessagesGlobal) {
        window.refreshSharedMessagesGlobal(false, true);
      }

      alert("Admin Panel Active. Management tools are now visible below.");
    } else {
      alert("Incorrect password.");
    }
  });
}

// Render the multi-event sections first so downstream inits (reveal
// animations, card tilt, calendar buttons) can operate on the generated DOM.
renderEventCards();
renderCeremonyTimeline();
renderLocations();
renderScratchDate();
renderCountdownTabs();
updateCountdownTargetLabel();

updateScrollEffects();
window.addEventListener("scroll", onScroll, { passive: true });

updateCountdown();
setInterval(updateCountdown, 1000);

initBackgroundMusic();
initOpeningDoors();
initRevealStagger();
initNavMenu();
initActiveNavTracking();
initScratchReveal();
initHeroSpotlight();
initRevealAnimations();
initMessagesForm();
initCardTilt();
initBackToTop();
initGuestPersonalization();
initCalendarButtons();
initAdminMode();

// Start background re-sync of any failed submissions
void processFailsafeBackups();
