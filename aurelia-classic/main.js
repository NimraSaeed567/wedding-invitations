// Demo-only admin password for the client-side admin view. Set your own before deploying.
const ADMIN_PASSWORD = "change-me";

/*
 * "Ali & Sara" placeholder wedding invitation template.
 * Multi-event (Mehndi / Baraat & Nikkah / Walima) variant.
 *
 * EVENTS is the single source of truth for every ceremony. Event Details,
 * the Ceremony Timeline, the Location cards/maps, the Countdown selector,
 * the scratch-card reveal date, and the RSVP "which celebrations" checkboxes
 * are all generated from this array at load time - edit the array below to
 * customize this card for a real client, no HTML edits required for those
 * sections.
 */

// Always start at the top on load/refresh, closed-envelope first - browsers
// otherwise restore the previous scroll position on reload, which would
// leave the (locked) page showing a mid-page section instead of the intro.
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);

const COUPLE_NAME = "Ali & Sara";

// Replace the placeholder venue/date fields below with the real client's details.
// dateISO values are parsed as the guest's local browser time (no UTC offset is
// applied). If the venue is in a specific timezone and you want every guest to
// see the same countdown regardless of where they are viewing from, append an
// explicit offset, e.g. "2026-04-10T18:00:00+05:00".
const EVENTS = [
  {
    key: "mehndi",
    name: "Mehndi",
    dateISO: "2026-11-12T18:00:00",
    timeLabel: "6:00 PM",
    venueName: "[Venue Name]",
    venueAddress: "[Full Address], [City]",
    mapQuery: "[Venue Name] [City]",
    timelineLabel: "Mehndi Night",
    description: "An evening of henna, music, and color as the celebrations begin."
  },
  {
    key: "baraat",
    name: "Baraat & Nikkah",
    dateISO: "2026-11-14T15:00:00",
    timeLabel: "3:00 PM",
    venueName: "[Venue Name]",
    venueAddress: "[Full Address], [City]",
    mapQuery: "[Venue Name] [City]",
    timelineLabel: "Nikkah Ceremony",
    description: "The formal Nikkah ceremony with family, duas, and celebration."
  },
  {
    key: "walima",
    name: "Walima",
    dateISO: "2026-11-15T19:00:00",
    timeLabel: "7:00 PM",
    venueName: "[Venue Name]",
    venueAddress: "[Full Address], [City]",
    mapQuery: "[Venue Name] [City]",
    timelineLabel: "Walima Reception",
    description: "A joyous reception dinner celebrating the new couple."
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

const openingEnvelope = document.getElementById("openingEnvelope");
const openEnvelopeBtn = document.getElementById("openEnvelope");
const envelopeNote = document.getElementById("envelopeNote");
const bgMusic = document.getElementById("bgMusic");
const musicToggle = document.getElementById("musicToggle");
const musicText = document.getElementById("musicText");
const musicPreferenceKey = "card2_music_enabled_v1";
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

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxClose = document.getElementById("lightboxClose");
const guestGalleryGrid = document.getElementById("guestGalleryGrid");
const featuredGalleryGrid = document.getElementById("galleryGrid");
const galleryUploadForm = document.getElementById("galleryUploadForm");
const galleryUploadFeedback = document.getElementById("galleryUploadFeedback");

const rsvpForm = document.getElementById("rsvpForm");
const formFeedback = document.getElementById("formFeedback");
const attendanceField = document.getElementById("attendance");
const guestsField = document.getElementById("guests");
const toTopBtn = document.getElementById("toTopBtn");
const celebrationLayer = document.getElementById("celebrationLayer");

const blessingForm = document.getElementById("blessingForm");
const blessingGrid = document.getElementById("blessingGrid");
const blessingFeedback = document.getElementById("blessingFeedback");

const blessingsStorageKey = "card2_blessings_v1";
const blessingsRefreshIntervalMs = 20000;
let blessingsRefreshTimerId = 0;
const guestGalleryStorageKey = "card2_guest_gallery_v1";
const guestGalleryRefreshIntervalMs = 25000;
let guestGalleryRefreshTimerId = 0;
const defaultBlessings = [];

/* -------------------------------------------------------------------------
 * Multi-event rendering: Event Details, Ceremony Timeline, Location cards,
 * Countdown selector, scratch-card date, and RSVP celebration checkboxes are
 * all generated here from the EVENTS array above.
 * ---------------------------------------------------------------------- */

function renderEventCards() {
  const container = document.getElementById("eventCards");
  if (!container) {
    return;
  }

  container.innerHTML = EVENTS.map((ev) => {
    const eventDate = new Date(ev.dateISO);
    return `
      <article class="event-card reveal glass">
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

function renderAttendingEventsCheckboxes() {
  const group = document.getElementById("attendingEventsGroup");
  if (!group) {
    return;
  }

  group.innerHTML = EVENTS.map((ev) => `
    <label class="checkbox-option">
      <input type="checkbox" name="attendingEvents" value="${ev.key}" checked />
      <span>${ev.name}</span>
    </label>
  `).join("");
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

function initOpeningEnvelope() {
  if (!openingEnvelope) {
    document.body.classList.remove("envelope-active");
    return;
  }

  document.body.classList.add("envelope-active");

  let envelopeState = "idle";
  const revealDelay = reducedMotionQuery.matches ? 140 : 1450;
  const sealBreakPause = reducedMotionQuery.matches ? 180 : 900;
  let wobbleTimeout = 0;
  let wobbleResetTimeout = 0;

  function setSealPressed(isPressed) {
    if (!openEnvelopeBtn || envelopeState === "opening" || envelopeState === "opened") {
      return;
    }

    openEnvelopeBtn.classList.toggle("is-pressed", isPressed);
  }

  function onEnvelopeKeydown(event) {
    if (event.key === "Enter" || event.key === " " || event.key === "Escape") {
      event.preventDefault();
      triggerEnvelopeOpen();
    }
  }

  function breakSeal() {
    if (envelopeState !== "idle") {
      return;
    }

    envelopeState = "broken";
    openingEnvelope.classList.add("seal-broken");
    if (envelopeNote) {
      envelopeNote.textContent = "This invitation is exclusively for you";
    }
    if (navigator.vibrate) {
      navigator.vibrate(18);
    }
  }

  function openEnvelope() {
    if (envelopeState === "opening" || envelopeState === "opened") {
      return;
    }

    if (envelopeState === "idle") {
      breakSeal();
      window.setTimeout(openEnvelope, sealBreakPause);
      return;
    }

    envelopeState = "opening";
    if (wobbleTimeout) {
      window.clearTimeout(wobbleTimeout);
      wobbleTimeout = 0;
    }
    if (wobbleResetTimeout) {
      window.clearTimeout(wobbleResetTimeout);
      wobbleResetTimeout = 0;
    }
    openingEnvelope.classList.add("opening");
    openingEnvelope.classList.remove("flap-wobble");
    wobbleTimeout = window.setTimeout(() => {
      if (envelopeState !== "opening") {
        return;
      }

      openingEnvelope.classList.add("flap-wobble");
      wobbleResetTimeout = window.setTimeout(() => {
        openingEnvelope.classList.remove("flap-wobble");
      }, reducedMotionQuery.matches ? 110 : 760);
    }, reducedMotionQuery.matches ? 0 : 150);
    if (envelopeNote) {
      envelopeNote.textContent = "Opening your invitation...";
    }
    window.setTimeout(() => {
      openingEnvelope.classList.add("closed");
      openingEnvelope.classList.remove("flap-wobble");
      document.body.classList.remove("envelope-active");
      envelopeState = "opened";
      updateScrollEffects();
    }, revealDelay);
    document.removeEventListener("keydown", onEnvelopeKeydown);
  }

  function triggerEnvelopeOpen() {
    setSealPressed(false);
    requestMusicStart(true);
    if (envelopeState === "idle") {
      breakSeal();
      window.setTimeout(openEnvelope, sealBreakPause);
      return;
    }
    openEnvelope();
  }

  if (openEnvelopeBtn) {
    openEnvelopeBtn.addEventListener("click", triggerEnvelopeOpen);
    openEnvelopeBtn.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }
      setSealPressed(true);
    });
    openEnvelopeBtn.addEventListener("pointerup", () => setSealPressed(false));
    openEnvelopeBtn.addEventListener("pointerleave", () => setSealPressed(false));
    openEnvelopeBtn.addEventListener("pointercancel", () => setSealPressed(false));
    openEnvelopeBtn.addEventListener("blur", () => setSealPressed(false));
  }

  openingEnvelope.addEventListener("click", (event) => {
    if (event.target === openingEnvelope) {
      triggerEnvelopeOpen();
    }
  });

  document.addEventListener("keydown", onEnvelopeKeydown);
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

function initScratchReveal() {
  if (!scratchCard || !scratchStage || !scratchCanvas || !scratchHint || !scratchSkip) {
    return;
  }

  const ctx = scratchCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    const earliest = getSortedEvents()[0];
    scratchHint.textContent = earliest
      ? `Our celebrations begin ${formatEventDateLong(new Date(earliest.dateISO))}`
      : "Scratch to reveal when our celebrations begin";
    return;
  }

  let isDrawing = false;
  let revealed = false;
  let dpr = 1;
  let moveCount = 0;

  function drawCover(width, height) {
    ctx.globalCompositeOperation = "source-over";
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "#fbe4ea");
    gradient.addColorStop(0.18, "#e3a9c2");
    gradient.addColorStop(0.42, "#cfe6f5");
    gradient.addColorStop(0.68, "#8fbfe0");
    gradient.addColorStop(1, "#f0cdda");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.translate(width * 0.08, -height * 0.25);
    ctx.rotate(-Math.PI / 10);
    for (let x = -height; x < width + height; x += 16) {
      ctx.fillRect(x, 0, 1.4, height * 2);
    }
    ctx.restore();

    const sheen = ctx.createLinearGradient(0, 0, 0, height);
    sheen.addColorStop(0, "rgba(255, 255, 255, 0.36)");
    sheen.addColorStop(0.45, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255, 248, 234, 0.72)";
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, width - 8, height - 8);

    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${Math.max(16, width * 0.062)}px "Cormorant Garamond", serif`;
    ctx.shadowColor = "rgba(35, 24, 12, 0.25)";
    ctx.shadowBlur = Math.max(8, width * 0.02);
    ctx.fillText("Scratch to reveal", width / 2, height / 2);
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
    const radius = Math.max(18, Math.min(30, scratchCanvas.clientWidth * 0.075));
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
    if (clearedRatio() > 0.52) {
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

function openLightbox(src, alt, caption) {
  lightboxImage.src = src;
  lightboxImage.alt = alt;
  lightboxCaption.textContent = caption;
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.src = "";
  document.body.style.overflow = "";
}

function initGalleryLightbox() {
  if (!lightbox || !lightboxClose || (!featuredGalleryGrid && !guestGalleryGrid)) {
    return;
  }

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }

    const item = target.closest(".gallery-item");
    if (!item) {
      return;
    }

    if (!item.closest(".featured-gallery-grid") && !item.closest(".guest-gallery-grid")) {
      return;
    }

    const img = item.querySelector("img");
    if (!img) {
      return;
    }

    const full = item.dataset.full || img.currentSrc || img.src;
    const caption = item.dataset.caption || "";
    openLightbox(full, img.alt || caption, caption);
  });

  lightboxClose.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox.classList.contains("open")) {
      closeLightbox();
    }
  });
}

function setFeedback(message, type) {
  formFeedback.textContent = message;
  formFeedback.classList.remove("error", "success");
  if (type) {
    formFeedback.classList.add(type);
  }
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

const FAILSAFE_STORAGE_KEY = "card2_data_failsafe_v1";

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
        if (item.type === "rsvp") {
          await submitSharedRsvp(item.payload, true);
        } else if (item.type === "blessing") {
          await submitSharedBlessing(item.payload, true);
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

function validateForm(data) {
  const errors = [];

  const fullName = data.get("fullName").trim();
  const email = data.get("email").trim();
  const phone = normalizePhone(data.get("phone").trim());
  const guests = Number.parseInt(data.get("guests"), 10);
  const attendance = data.get("attendance");
  const attendingEvents = data.getAll("attendingEvents");

  if (fullName.length < 2) {
    errors.push("Please enter your full name.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Please enter a valid email address.");
  }

  if (!/^\+?\d{8,15}$/.test(phone)) {
    errors.push("Please enter a valid phone number.");
  }

  if (!Number.isInteger(guests) || guests < 0 || guests > 10) {
    errors.push("Guests must be between 0 and 10.");
  }

  if (!attendance) {
    errors.push("Please select whether you will attend.");
  }

  if (attendance === "yes" && guests === 0) {
    errors.push("Set at least 1 guest if you are attending.");
  }

  if (attendance === "yes" && attendingEvents.length === 0) {
    errors.push("Please select at least one celebration you will attend.");
  }

  return errors;
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

function getRsvpEndpoint() {
  return getFormEndpoint(rsvpForm, "YOUR_FORMSPREE_RSVP_ENDPOINT");
}

function getBlessingEndpoint() {
  return getFormEndpoint(blessingForm, "YOUR_FORMSPREE_BLESSING_ENDPOINT");
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

function getBlessingSyncConfig() {
  if (!blessingForm) {
    return null;
  }

  const ownSyncUrl = getDataAttributeValue(blessingForm, "syncUrl", "data-sync-url").replace(/\/+$/, "");
  const ownSyncKey = getDataAttributeValue(blessingForm, "syncKey", "data-sync-key");
  const fallbackSyncUrl = getDataAttributeValue(galleryUploadForm, "syncUrl", "data-sync-url").replace(/\/+$/, "");
  const fallbackSyncKey = getDataAttributeValue(galleryUploadForm, "syncKey", "data-sync-key");
  const syncUrl = ownSyncUrl || fallbackSyncUrl;
  const syncKey = ownSyncKey || fallbackSyncKey;
  const syncTable = getDataAttributeValue(blessingForm, "syncTable", "data-sync-table") || "card2_blessings_wall";

  if (!syncUrl || !syncKey || !syncTable || syncUrl.includes("YOUR_SUPABASE_PROJECT_URL") || syncKey.includes("YOUR_SUPABASE_ANON_KEY")) {
    return null;
  }

  return { syncUrl, syncKey, syncTable };
}

function getRsvpSyncConfig() {
  if (!rsvpForm) {
    return null;
  }

  const syncUrl = getDataAttributeValue(rsvpForm, "syncUrl", "data-sync-url").replace(/\/+$/, "");
  const syncKey = getDataAttributeValue(rsvpForm, "syncKey", "data-sync-key");
  const syncTable = getDataAttributeValue(rsvpForm, "syncTable", "data-sync-table") || "card2_rsvp_responses";

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

async function fetchSharedBlessings() {
  const syncConfig = getBlessingSyncConfig();
  if (!syncConfig) {
    return null;
  }

  const requestUrl =
    `${syncConfig.syncUrl}/rest/v1/${syncConfig.syncTable}` +
    "?select=id,name,message,created_at&order=created_at.desc&limit=18";

  const response = await fetch(requestUrl, {
    headers: buildSupabaseHeaders(syncConfig.syncKey)
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(response);
    throw new Error(errorMessage || `Shared blessings load failed with status ${response.status}.`);
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
      message: escapeText(item.message).slice(0, 180),
      createdAt: item.created_at || ""
    }));
}

async function submitSharedBlessing(entry) {
  const syncConfig = getBlessingSyncConfig();
  if (!syncConfig) {
    return false;
  }

  const requestUrl = `${syncConfig.syncUrl}/rest/v1/${syncConfig.syncTable}`;
  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      ...buildSupabaseHeaders(syncConfig.syncKey, true),
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      name: entry.name || entry.full_name, // Support both entry formats
      message: entry.message
    })
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(response);
    throw new Error(errorMessage || `Shared blessing save failed with status ${response.status}.`);
  }

  return true;
}

function setGalleryUploadFeedback(message, type) {
  if (!galleryUploadFeedback) {
    return;
  }

  galleryUploadFeedback.textContent = message;
  galleryUploadFeedback.classList.remove("error", "success");
  if (type) {
    galleryUploadFeedback.classList.add(type);
  }
}

function sanitizeImageUrl(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmedValue, window.location.origin);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return "";
    }
    return parsedUrl.href;
  } catch (_error) {
    return "";
  }
}

function normalizeGuestGalleryEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const imageUrl = sanitizeImageUrl(String(entry.imageUrl || entry.image_url || ""));
  if (!imageUrl) {
    return null;
  }

  const thumbUrl =
    sanitizeImageUrl(String(entry.thumbUrl || entry.thumb_url || entry.imageUrl || entry.image_url || "")) ||
    imageUrl;
  const caption = escapeText(String(entry.caption || "Guest moment")).slice(0, 80) || "Guest moment";
  const uploadedBy = escapeText(String(entry.uploadedBy || entry.uploaded_by || "")).slice(0, 40);
  const createdAt =
    typeof entry.createdAt === "string"
      ? entry.createdAt
      : typeof entry.created_at === "string"
        ? entry.created_at
        : "";

  return {
    id: entry.id || null,
    imageUrl,
    thumbUrl,
    caption,
    uploadedBy,
    createdAt
  };
}

function getStoredGuestGallery() {
  try {
    const stored = localStorage.getItem(guestGalleryStorageKey);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => normalizeGuestGalleryEntry(item)).filter((item) => item);
  } catch (_error) {
    return [];
  }
}

function saveGuestGallery(entries) {
  try {
    localStorage.setItem(guestGalleryStorageKey, JSON.stringify(entries));
  } catch (_error) {
    // Ignore storage failures and keep runtime state only.
  }
}

function buildGuestGalleryCaption(entry) {
  return entry.uploadedBy ? `${entry.caption} - ${entry.uploadedBy}` : entry.caption;
}

function renderGuestGallery(entries) {
  if (!guestGalleryGrid) {
    return;
  }

  guestGalleryGrid.innerHTML = "";
  const safeEntries = Array.isArray(entries) ? entries : [];

  if (safeEntries.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "guest-gallery-empty";
    emptyState.textContent = "Guest uploads will appear here during the ceremony.";
    guestGalleryGrid.appendChild(emptyState);
    return;
  }

  safeEntries.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "gallery-item guest-gallery-item";
    card.role = "button";
    card.tabIndex = 0;

    const caption = buildGuestGalleryCaption(entry);
    card.dataset.caption = caption;
    card.dataset.full = entry.imageUrl;

    const image = document.createElement("img");
    image.src = entry.thumbUrl;
    image.alt = caption;
    image.loading = "lazy";
    image.decoding = "async";

    card.appendChild(image);

    if (isAdmin && entry.id) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.type = "button";
      deleteBtn.title = "Delete this moment";
      deleteBtn.style.opacity = "1"; // Force visibility in JS
      deleteBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      `;
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        confirmDeletion(entry.id, entry.imageUrl);
      });
      card.appendChild(deleteBtn);
    }

    guestGalleryGrid.appendChild(card);
  });
}

async function confirmDeletion(id, imageUrl) {
  if (!confirm("Are you sure you want to delete this moment forever?")) {
    return;
  }

  try {
    const syncConfig = getGallerySyncConfig();
    if (!syncConfig) return;

    // 1. Delete from Storage (if Supabase)
    if (imageUrl.includes("/public/")) {
      try {
        const objectKey = imageUrl.split("/public/")[1].split("/").slice(1).join("/");
        const storageUrl = `${syncConfig.syncUrl}/storage/v1/object/${syncConfig.galleryBucket}/${objectKey}`;

        await fetch(storageUrl, {
          method: "DELETE",
          headers: buildSupabaseHeaders(syncConfig.syncKey)
        });
      } catch (e) {
        console.warn("Storage deletion ignored", e);
      }
    }

    // 2. Delete from Database
    const dbUrl = `${syncConfig.syncUrl}/rest/v1/${syncConfig.galleryTable}?id=eq.${id}`;
    await fetch(dbUrl, {
      method: "DELETE",
      headers: buildSupabaseHeaders(syncConfig.syncKey)
    });

    // 3. Refresh UI
    launchCelebrationBurst(guestGalleryGrid, 8);
    const refreshFn = window.refreshSharedGalleryGlobal;
    if (refreshFn) await refreshFn(false);

    // Also refresh admin panel if it exists
    if (typeof refreshAdminPanel === "function") {
      void refreshAdminPanel();
    }

  } catch (error) {
    console.error("Deletion failed:", error);
    alert("Could not delete the image. Check Supabase policies.");
  }
}

function getGallerySyncConfig() {
  if (!galleryUploadForm) {
    return null;
  }

  const syncUrlInput = getDataAttributeValue(galleryUploadForm, "syncUrl", "data-sync-url").replace(/\/+$/, "");
  const syncKeyInput = getDataAttributeValue(galleryUploadForm, "syncKey", "data-sync-key");
  const table =
    getDataAttributeValue(galleryUploadForm, "galleryTable", "data-gallery-table") || "card2_gallery_photos";
  const bucket = (
    getDataAttributeValue(galleryUploadForm, "galleryBucket", "data-gallery-bucket") ||
    "card2-gallery"
  ).trim();
  const limitValue = Number.parseInt(
    getDataAttributeValue(galleryUploadForm, "galleryLimit", "data-gallery-limit") || "36",
    10
  );
  const maxFileMbValue = Number.parseInt(
    getDataAttributeValue(galleryUploadForm, "maxFileMb", "data-max-file-mb") || "8",
    10
  );

  const syncUrl = syncUrlInput;
  const syncKey = syncKeyInput;

  if (!syncUrl || !syncKey || !table || syncUrl.includes("YOUR_SUPABASE_PROJECT_URL") || syncKey.includes("YOUR_SUPABASE_ANON_KEY")) {
    return null;
  }

  const galleryLimit = Number.isInteger(limitValue) ? Math.min(Math.max(limitValue, 6), 90) : 36;
  const maxFileMb = Number.isInteger(maxFileMbValue) ? Math.min(Math.max(maxFileMbValue, 2), 20) : 8;

  return {
    syncUrl,
    syncKey,
    galleryTable: table,
    galleryBucket: bucket,
    galleryLimit,
    maxFileBytes: maxFileMb * 1024 * 1024
  };
}

function getSafeImageExtension(file) {
  const byMimeType = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif"
  };

  const mimeType = file && typeof file.type === "string" ? file.type.toLowerCase() : "";
  if (mimeType && byMimeType[mimeType]) {
    return byMimeType[mimeType];
  }

  const fileName = file && typeof file.name === "string" ? file.name.toLowerCase() : "";
  const extensionMatch = fileName.match(/\.([a-z0-9]+)$/);
  const extension = extensionMatch ? extensionMatch[1] : "";
  if (["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  return "jpg";
}

async function compressImage(file, maxWidth = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(file); // Don't try to compress non-images (though input is restricted to images)
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file); // Fallback to original if compression fails
            return;
          }
          const origName = file.name.replace(/\.[^/.]+$/, "");
          const newFile = new File([blob], `${origName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(newFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = (err) => resolve(file); // Fallback to original
    };
    reader.onerror = (err) => resolve(file); // Fallback to original
  });
}

async function uploadSharedGalleryImage(originalFile, syncConfig) {
  // Compress image before sending to save bandwidth and Supabase storage
  let file = originalFile;
  try {
    file = await compressImage(originalFile, 1280, 0.8);
  } catch (e) {
    console.warn("Client-side compression failed, uploading original.", e);
  }

  const extension = getSafeImageExtension(file);
  const uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const objectKey = `guest-uploads/${uniquePart}.${extension}`;
  const uploadUrl = `${syncConfig.syncUrl}/storage/v1/object/${syncConfig.galleryBucket}/${objectKey}`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      ...buildSupabaseHeaders(syncConfig.syncKey),
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false"
    },
    body: file
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(response);
    throw new Error(errorMessage || `Photo upload failed with status ${response.status}.`);
  }

  const imageUrl = `${syncConfig.syncUrl}/storage/v1/object/public/${syncConfig.galleryBucket}/${objectKey}`;
  return { imageUrl, objectKey };
}

async function submitSharedGalleryEntry(entry, syncConfig) {
  const requestUrl = `${syncConfig.syncUrl}/rest/v1/${syncConfig.galleryTable}`;
  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      ...buildSupabaseHeaders(syncConfig.syncKey, true),
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      image_url: entry.imageUrl,
      thumb_url: entry.thumbUrl,
      caption: entry.caption,
      uploaded_by: entry.uploadedBy || null
    })
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(response);
    throw new Error(errorMessage || `Gallery save failed with status ${response.status}.`);
  }

  const insertedRows = await response.json();
  if (!Array.isArray(insertedRows) || insertedRows.length === 0) {
    return entry;
  }

  return normalizeGuestGalleryEntry(insertedRows[0]) || entry;
}

async function fetchSharedGalleryEntries(syncConfig) {
  const requestUrl =
    `${syncConfig.syncUrl}/rest/v1/${syncConfig.galleryTable}` +
    `?select=id,image_url,thumb_url,caption,uploaded_by,created_at&order=created_at.desc&limit=${syncConfig.galleryLimit}`;

  const response = await fetch(requestUrl, {
    headers: buildSupabaseHeaders(syncConfig.syncKey)
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(response);
    throw new Error(errorMessage || `Gallery load failed with status ${response.status}.`);
  }

  const records = await response.json();
  if (!Array.isArray(records)) {
    return [];
  }

  return records.map((record) => normalizeGuestGalleryEntry(record)).filter((item) => item);
}

function initGuestGalleryUploads() {
  if (!galleryUploadForm || !guestGalleryGrid) {
    return;
  }

  const submitButton = galleryUploadForm.querySelector('button[type="submit"]');
  const submitButtonText = submitButton ? submitButton.textContent : "";

  let guestEntries = getStoredGuestGallery();
  renderGuestGallery(guestEntries);

  async function refreshSharedGallery(showErrorFeedback = false, forceRender = false) {
    const syncConfig = getGallerySyncConfig();
    if (!syncConfig) {
      return;
    }

    try {
      const sharedEntries = await fetchSharedGalleryEntries(syncConfig);
      const nextEntries = sharedEntries.slice(0, syncConfig.galleryLimit);

      if (forceRender || JSON.stringify(nextEntries) !== JSON.stringify(guestEntries)) {
        guestEntries = nextEntries;
        saveGuestGallery(guestEntries);
        renderGuestGallery(guestEntries);
      }

      if (showErrorFeedback) {
        setGalleryUploadFeedback("", "");
      }
    } catch (error) {
      console.error(error);
      if (showErrorFeedback) {
        setGalleryUploadFeedback(
          error instanceof Error && error.message
            ? error.message
            : "Could not load guest gallery right now. Showing saved photos.",
          "error"
        );
      }
    }
  }

  if (getGallerySyncConfig()) {
    void refreshSharedGallery(false);

    if (guestGalleryRefreshTimerId) {
      window.clearInterval(guestGalleryRefreshTimerId);
      guestGalleryRefreshTimerId = 0;
    }

    guestGalleryRefreshTimerId = window.setInterval(() => {
      if (document.hidden) {
        return;
      }
      void refreshSharedGallery(false);
    }, guestGalleryRefreshIntervalMs);
  }

  // Expose refresh function globally for deletion callback
  window.refreshSharedGalleryGlobal = refreshSharedGallery;

  galleryUploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const syncConfig = getGallerySyncConfig();
    if (!syncConfig) {
      setGalleryUploadFeedback(
        "Gallery upload backend is not configured yet. Add your Supabase project URL/key on #galleryUploadForm in index.html.",
        "error"
      );
      return;
    }

    const formData = new FormData(galleryUploadForm);
    const uploaderName = escapeText(String(formData.get("galleryUploaderName") || "")).slice(0, 40);
    const caption = escapeText(String(formData.get("galleryCaption") || "")).slice(0, 80);
    const file = formData.get("galleryPhotoFile");

    if (uploaderName && uploaderName.length < 2) {
      setGalleryUploadFeedback("Please enter at least 2 characters for name or leave it blank.", "error");
      return;
    }

    if (caption.length < 3) {
      setGalleryUploadFeedback("Please add a short caption (at least 3 characters).", "error");
      return;
    }

    if (!(file instanceof File) || file.size === 0) {
      setGalleryUploadFeedback("Please choose an image file to upload.", "error");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setGalleryUploadFeedback("Only image files are allowed.", "error");
      return;
    }

    if (file.size > syncConfig.maxFileBytes) {
      const maxSizeMb = Math.round(syncConfig.maxFileBytes / (1024 * 1024));
      setGalleryUploadFeedback(`File is too large. Maximum allowed size is ${maxSizeMb} MB.`, "error");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Uploading...";
    }
    setGalleryUploadFeedback("", "");

    try {
      const uploadedAsset = await uploadSharedGalleryImage(file, syncConfig);
      const draftEntry = normalizeGuestGalleryEntry({
        imageUrl: uploadedAsset.imageUrl,
        thumbUrl: uploadedAsset.imageUrl,
        caption,
        uploadedBy: uploaderName,
        createdAt: new Date().toISOString()
      });

      if (!draftEntry) {
        throw new Error("Uploaded image could not be prepared for gallery display.");
      }

      const savedEntry = await submitSharedGalleryEntry(draftEntry, syncConfig);
      guestEntries.unshift(savedEntry);
      guestEntries = guestEntries.slice(0, syncConfig.galleryLimit);

      saveGuestGallery(guestEntries);
      renderGuestGallery(guestEntries);
      setGalleryUploadFeedback("Photo uploaded successfully. It is now visible to all guests.", "success");
      launchCelebrationBurst(galleryUploadForm, 14);
      galleryUploadForm.reset();
      void refreshSharedGallery(false);
    } catch (error) {
      console.error(error);
      setGalleryUploadFeedback(
        error instanceof Error && error.message
          ? error.message
          : "Could not upload your photo right now. Please try again.",
        "error"
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButtonText || "Upload Photo";
      }
    }
  });
}

async function submitRsvpData(data) {
  const endpoint = getRsvpEndpoint();
  if (!endpoint) {
    throw new Error("RSVP endpoint is not configured.");
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
    throw new Error(errorMessage || `RSVP submission failed with status ${response.status}.`);
  }
}

async function submitSharedRsvp(data) {
  const syncConfig = getRsvpSyncConfig();
  if (!syncConfig) {
    return;
  }

  // Handle both FormData (from live form) and raw objects (from failsafe backup)
  const isFormData = data instanceof FormData;
  const payload = {
    full_name: isFormData ? data.get("fullName") : data.full_name,
    email: isFormData ? data.get("email") : data.email,
    phone: normalizePhone(isFormData ? data.get("phone") : data.phone),
    guests: Number.parseInt(isFormData ? data.get("guests") : data.guests, 10),
    attendance: isFormData ? data.get("attendance") : data.attendance,
    // NOTE: attending_events expects a jsonb (or text[]) column on card2_rsvp_responses.
    attending_events: isFormData ? data.getAll("attendingEvents") : (data.attending_events || [])
  };

  const response = await fetch(`${syncConfig.syncUrl}/rest/v1/${syncConfig.syncTable}`, {
    method: "POST",
    headers: buildSupabaseHeaders(syncConfig.syncKey, true),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(response);
    throw new Error(errorMessage || `Shared RSVP save failed with status ${response.status}.`);
  }
}

async function fetchSharedRsvps() {
  const syncConfig = getRsvpSyncConfig();
  if (!syncConfig) return [];

  const response = await fetch(`${syncConfig.syncUrl}/rest/v1/${syncConfig.syncTable}?select=*&order=created_at.desc`, {
    headers: buildSupabaseHeaders(syncConfig.syncKey)
  });

  if (!response.ok) {
    const errorMessage = await parseApiError(response);
    throw new Error(errorMessage || `RSVPs load failed with status ${response.status}.`);
  }

  return await response.json();
}

async function confirmRsvpDeletion(id) {
  if (!confirm("Are you sure you want to delete this RSVP?")) return;

  try {
    const syncConfig = getRsvpSyncConfig();
    if (!syncConfig) return;

    await fetch(`${syncConfig.syncUrl}/rest/v1/${syncConfig.syncTable}?id=eq.${id}`, {
      method: "DELETE",
      headers: buildSupabaseHeaders(syncConfig.syncKey)
    });

    void refreshAdminPanel();
  } catch (error) {
    console.error("RSVP deletion failed:", error);
    alert("Could not delete RSVP.");
  }
}

function formatAttendingEvents(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "—";
  }
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return "—";
}

async function refreshAdminPanel() {
  const rsvpBody = document.getElementById("adminRsvpBody");
  const blessingList = document.getElementById("adminBlessingList");
  const galleryGrid = document.getElementById("adminGalleryGrid");

  try {
    // 1. RSVPs
    if (rsvpBody) {
      const rsvps = await fetchSharedRsvps();
      rsvpBody.innerHTML = rsvps.map(r => `
        <tr>
          <td>${escapeText(r.full_name)}</td>
          <td>${r.guests}</td>
          <td>${r.attendance === 'yes' ? '✅ Yes' : '❌ No'}</td>
          <td>${escapeText(formatAttendingEvents(r.attending_events))}</td>
          <td style="font-size: 0.8rem;">${escapeText(r.email)}<br>${escapeText(r.phone)}</td>
          <td>${new Date(r.created_at).toLocaleDateString()}</td>
          <td>
            <button class="admin-delete-btn" onclick="confirmRsvpDeletion('${r.id}')">
              <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </td>
        </tr>
      `).join("") || "<tr><td colspan='7'>No RSVPs found.</td></tr>";
    }

    // 2. Blessings (Reuse shared logic)
    if (blessingList) {
      const blessings = await fetchSharedBlessings();
      blessingList.innerHTML = blessings.map(b => `
        <div class="admin-list-item">
          <div class="admin-list-info">
            <h4>${escapeText(b.name)}</h4>
            <p>${escapeText(b.message)}</p>
          </div>
          <button class="admin-delete-btn" onclick="confirmBlessingDeletion('${b.id}')">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      `).join("") || "<p>No blessings found.</p>";
    }

    // 3. Gallery
    if (galleryGrid) {
      const syncConfig = getGallerySyncConfig();
      const photos = await fetchSharedGalleryEntries(syncConfig);
      galleryGrid.innerHTML = photos.map(p => `
        <div class="admin-grid-item">
          <img src="${p.thumbUrl}" alt="Gallery item">
          <div class="admin-delete-btn-overlay">
            <button class="admin-delete-btn" onclick="confirmDeletion('${p.id}', '${p.imageUrl}')">
              <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </div>
      `).join("") || "<p>No photos found.</p>";
    }
  } catch (error) {
    console.error("Admin Panel Refresh Error:", error);
  }
}

function initAdminPanelTabs() {
  const tabs = document.querySelectorAll(".admin-tabs button");
  const contents = document.querySelectorAll(".admin-tab-content");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      contents.forEach(content => {
        content.style.display = content.id === `panel-${target}` ? "block" : "none";
      });
    });
  });
}

// Expose actions to window for onclick handlers in template strings
window.confirmRsvpDeletion = confirmRsvpDeletion;
window.confirmBlessingDeletion = confirmBlessingDeletion;
window.confirmDeletion = confirmDeletion; // Shared with gallery existing logic

async function submitBlessingData(data) {
  const endpoint = getBlessingEndpoint();
  if (!endpoint) {
    throw new Error("Blessing endpoint is not configured.");
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
    throw new Error(errorMessage || `Blessing submission failed with status ${response.status}.`);
  }
}

function initRsvpForm() {
  if (!rsvpForm) {
    return;
  }

  const submitButton = rsvpForm.querySelector('button[type="submit"]');
  const submitButtonText = submitButton ? submitButton.textContent : "";

  attendanceField.addEventListener("change", () => {
    if (attendanceField.value === "no") {
      guestsField.value = "0";
    } else if (attendanceField.value === "yes" && Number.parseInt(guestsField.value, 10) === 0) {
      guestsField.value = "1";
    }
  });

  rsvpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(rsvpForm);
    const errors = validateForm(data);

    if (errors.length > 0) {
      setFeedback(errors[0], "error");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }
    setFeedback("", "");

    try {
      // 1. SILENT SYNC to Supabase (the primary source of truth)
      const hasSharedSync = Boolean(getRsvpSyncConfig());
      let supabaseSuccess = false;

      if (hasSharedSync) {
        try {
          // Attempt with retry logic
          await withRetry(() => submitSharedRsvp(data), 3, 800);
          supabaseSuccess = true;
        } catch (dbError) {
          console.error("Database sync failed after retries, queuing for later.", dbError);
          // Queue in local storage as a last resort
          saveToFailsafeBackup("rsvp", {
            full_name: data.get("fullName"),
            email: data.get("email"),
            phone: data.get("phone"),
            guests: data.get("guests"),
            attendance: data.get("attendance"),
            attending_events: data.getAll("attendingEvents")
          });
        }
      }

      // 2. SUBMIT to Formspree (for email notifications)
      try {
        await submitRsvpData(data);
      } catch (formError) {
        console.warn("Formspree notification limit reached or failed.", formError);
        // If Supabase worked, don't show an error to the user!
        // We have the data, the email is just a nice-to-have.
        if (!supabaseSuccess) {
          throw formError; // Re-throw if BOTH failed
        }
      }

      setFeedback("Thank you! Your RSVP has been received successfully.", "success");
      rsvpForm.classList.add("success-pulse");
      launchCelebrationBurst(rsvpForm, 28);
      setTimeout(() => {
        rsvpForm.classList.remove("success-pulse");
      }, 900);
      rsvpForm.reset();
      guestsField.value = "1";
    } catch (error) {
      console.error("Final RSVP submission failure:", error);
      setFeedback(
        error instanceof Error && error.message
          ? error.message
          : "We could not send your RSVP right now. Please try again.",
        "error"
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButtonText || "Send RSVP";
      }
    }
  });
}

function setBlessingFeedback(message, type) {
  if (!blessingFeedback) {
    return;
  }

  blessingFeedback.textContent = message;
  blessingFeedback.classList.remove("error", "success");
  if (type) {
    blessingFeedback.classList.add(type);
  }
}

function escapeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function getStoredBlessings() {
  try {
    const stored = localStorage.getItem(blessingsStorageKey);
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

function saveBlessings(list) {
  try {
    localStorage.setItem(blessingsStorageKey, JSON.stringify(list));
  } catch (_error) {
    // Ignore storage failures and keep functionality in-memory.
  }
}

function renderBlessings(list) {
  if (!blessingGrid) {
    return;
  }

  blessingGrid.innerHTML = "";
  const entries = list.slice(0, 18);

  entries.forEach((entry, index) => {
    const card = document.createElement("article");
    card.className = `blessing-card theme-${(index % 3) + 1}`;

    const message = document.createElement("p");
    message.textContent = entry.message;

    const author = document.createElement("footer");
    author.textContent = `- ${entry.name}`;

    card.appendChild(message);
    card.appendChild(author);

    if (isAdmin && entry.id) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn"; // Using same class as gallery delete button
      deleteBtn.type = "button";
      deleteBtn.title = "Remove this blessing";
      deleteBtn.style.opacity = "1";
      deleteBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      `;
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        confirmBlessingDeletion(entry.id);
      });
      card.appendChild(deleteBtn);
    }

    blessingGrid.appendChild(card);
  });
}

async function confirmBlessingDeletion(id) {
  if (!confirm("Are you sure you want to remove this blessing?")) {
    return;
  }

  try {
    const syncConfig = getBlessingSyncConfig();
    if (!syncConfig) return;

    const dbUrl = `${syncConfig.syncUrl}/rest/v1/${syncConfig.syncTable}?id=eq.${id}`;
    await fetch(dbUrl, {
      method: "DELETE",
      headers: buildSupabaseHeaders(syncConfig.syncKey)
    });

    launchCelebrationBurst(blessingGrid, 8);
    if (window.refreshSharedBlessingsGlobal) {
      await window.refreshSharedBlessingsGlobal(false, true);
    }

    // Also refresh admin panel if it exists
    if (typeof refreshAdminPanel === "function") {
      void refreshAdminPanel();
    }
  } catch (error) {
    console.error("Blessing deletion failed:", error);
    alert("Could not remove blessing. Check Supabase policies.");
  }
}

function initBlessingsWall() {
  if (!blessingForm || !blessingGrid) {
    return;
  }

  const submitButton = blessingForm.querySelector('button[type="submit"]');
  const submitButtonText = submitButton ? submitButton.textContent : "";
  const hasSharedSync = Boolean(getBlessingSyncConfig());

  let blessings = getStoredBlessings();
  if (!blessings || blessings.length === 0) {
    blessings = defaultBlessings.slice();
    saveBlessings(blessings);
  }

  renderBlessings(blessings);

  async function refreshFromShared(showErrorFeedback = false, forceRender = false) {
    if (!hasSharedSync) {
      return;
    }

    try {
      const sharedBlessings = await fetchSharedBlessings();
      if (!Array.isArray(sharedBlessings)) {
        return;
      }

      const nextBlessings = sharedBlessings.length > 0 ? sharedBlessings.slice(0, 18) : defaultBlessings.slice();
      const nextSerialized = JSON.stringify(nextBlessings);
      const currentSerialized = JSON.stringify(blessings);

      if (forceRender || nextSerialized !== currentSerialized) {
        blessings = nextBlessings;
        saveBlessings(blessings);
        renderBlessings(blessings);
      }

      if (showErrorFeedback) {
        setBlessingFeedback("", "");
      }
    } catch (error) {
      console.error(error);
      if (showErrorFeedback) {
        setBlessingFeedback(
          error instanceof Error && error.message
            ? error.message
            : "Could not load shared blessings right now. Showing saved blessings.",
          "error"
        );
      }
    }
  }

  if (hasSharedSync) {
    void refreshFromShared(true);

    if (blessingsRefreshTimerId) {
      window.clearInterval(blessingsRefreshTimerId);
      blessingsRefreshTimerId = 0;
    }

    blessingsRefreshTimerId = window.setInterval(() => {
      if (document.hidden) {
        return;
      }
      void refreshFromShared(false);
    }, blessingsRefreshIntervalMs);
  }

  // Expose refresh function globally for deletion callback
  window.refreshSharedBlessingsGlobal = refreshFromShared;

  blessingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(blessingForm);
    const name = escapeText(String(formData.get("blessingName") || ""));
    const message = escapeText(String(formData.get("blessingMessage") || ""));

    if (name.length < 2) {
      setBlessingFeedback("Please enter your name.", "error");
      return;
    }
    if (message.length < 8) {
      setBlessingFeedback("Please write a slightly longer blessing.", "error");
      return;
    }

    const newBlessing = { name: name.slice(0, 50), message: message.slice(0, 180) };
    formData.set("blessingName", newBlessing.name);
    formData.set("blessingMessage", newBlessing.message);

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }
    setBlessingFeedback("", "");

    try {
      let supabaseSuccess = false;

      // 1. SYNC to Supabase (primary)
      if (hasSharedSync) {
        try {
          await withRetry(() => submitSharedBlessing(newBlessing), 3, 800);
          supabaseSuccess = true;
          // Optimistic update
          if (!blessings.some(b => b.message === newBlessing.message)) {
            blessings.unshift(newBlessing);
            blessings = blessings.slice(0, 18);
            saveBlessings(blessings);
            renderBlessings(blessings);
          }
          void refreshFromShared(false);
        } catch (dbError) {
          console.error("Blessing database sync failed, queuing.", dbError);
          saveToFailsafeBackup("blessing", newBlessing);
        }
      }

      // 2. SUBMIT to Formspree (email backup)
      try {
        await submitBlessingData(formData);
      } catch (formError) {
        console.warn("Blessing email limit reached.", formError);
        if (!supabaseSuccess) throw formError;
      }

      setBlessingFeedback("Your blessing has been shared on the wall! Thank you.", "success");
      launchCelebrationBurst(blessingForm, 18);
      blessingForm.reset();

      // If not synced, add to local list immediately for UX
      if (!hasSharedSync) {
        blessings.unshift(newBlessing);
        blessings = blessings.slice(0, 18);
        saveBlessings(blessings);
        renderBlessings(blessings);
      }
    } catch (error) {
      console.error("Blessing submission failure:", error);
      setBlessingFeedback(
        error instanceof Error && error.message
          ? error.message
          : "Could not share your blessing right now. Please try again.",
        "error"
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButtonText || "Add Blessing";
      }
    }
  });
}

function initCardTilt() {
  if (reducedMotionQuery.matches || !window.matchMedia("(hover:hover) and (pointer:fine)").matches) {
    return;
  }

  const tiltCards = document.querySelectorAll(
    ".event-card, .dress-item, .count-card, .timeline-content, .location-card, .story-image-wrap, .blessing-card"
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

      initAdminPanelTabs();
      void refreshAdminPanel();

      // Re-render gallery even if data hasn't changed to show delete buttons
      if (window.refreshSharedGalleryGlobal) {
        // We pass true as a second argument to force render
        window.refreshSharedGalleryGlobal(false, true);
      }

      // Re-render blessings to show delete buttons
      if (window.refreshSharedBlessingsGlobal) {
        window.refreshSharedBlessingsGlobal(false, true);
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
renderAttendingEventsCheckboxes();
renderScratchDate();
renderCountdownTabs();
updateCountdownTargetLabel();

updateScrollEffects();
window.addEventListener("scroll", onScroll, { passive: true });

updateCountdown();
setInterval(updateCountdown, 1000);

initBackgroundMusic();
initOpeningEnvelope();
initRevealStagger();
initNavMenu();
initActiveNavTracking();
initScratchReveal();
initHeroSpotlight();
initRevealAnimations();
initGalleryLightbox();
initGuestGalleryUploads();
initBlessingsWall();
initCardTilt();
initRsvpForm();
initBackToTop();
initGuestPersonalization();
initCalendarButtons();
initAdminMode();

// Start background re-sync of any failed submissions
void processFailsafeBackups();
