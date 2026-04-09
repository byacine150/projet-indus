/* ============================================
   PIXEL ART WEBSITE – JAVASCRIPT
   Audio Engine · Playbar · Auto-Scroll · Card Highlighting
   ============================================ */

(function () {
    'use strict';

    // ─── DOM refs ────────────────────────────────────
    const startBtn       = document.getElementById('start-btn');
    const playbar        = document.getElementById('audioBar');
    const playPauseBtn   = document.getElementById('playPauseBtn');
    const progressBar    = document.getElementById('barProgress');
    const progressFill   = document.getElementById('barProgressFill');
    const currentTimeEl  = document.getElementById('barCurrentTime');
    const totalTimeEl    = document.getElementById('barDuration');
    const sectionLabel   = document.getElementById('barSectionNum');
    const volumeSlider   = document.getElementById('volumeSlider');
    const dots           = document.querySelectorAll('.dot');
    const sections       = document.querySelectorAll('.content-section');

    // ─── State ───────────────────────────────────────
    const SECTION_COUNT = sections.length;
    const audioFiles = Array.from(sections).map(s => (s.getAttribute('data-audio') || '').replace(/\\/g, '/'));

    let currentSection = 0;   // 0-indexed (0 = section 1)
    let audio = null;
    let isPlaying = false;
    let isSeeking = false;
    let started = false;
    let section4Scrolled = false; // track if we already auto-scrolled in section 4
    let section7Scrolled = false; // track if we already auto-scrolled in section 7

    // ─── Helpers ─────────────────────────────────────
    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function scrollToSection(index) {
        const target = index === -1
            ? document.getElementById('home')
            : sections[index];
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // ─── Fullscreen ──────────────────────────────────
    function enterFullscreen() {
        const el = document.documentElement;
        if (el.requestFullscreen) {
            el.requestFullscreen().catch(() => {});
        } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
            el.msRequestFullscreen();
        }
    }

    // ─── Audio ───────────────────────────────────────
    function loadAudio(index) {
        if (audio) {
            audio.pause();
            audio.removeEventListener('ended', onAudioEnded);
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('loadedmetadata', onMetaLoaded);
        }

        audio = new Audio(audioFiles[index]);
        if (volumeSlider) audio.volume = volumeSlider.value;
        audio.addEventListener('ended', onAudioEnded);
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('loadedmetadata', onMetaLoaded);

        currentSection = index;
        section4Scrolled = false;
        section7Scrolled = false;
        updateDots();
        sectionLabel.textContent = index + 1;
        clearAllHighlights();
    }

    function playAudio() {
        if (!audio) return;
        audio.play().then(() => {
            isPlaying = true;
            updatePlayPauseUI();
        }).catch(err => {
            console.warn('Audio play blocked:', err);
        });
    }

    function pauseAudio() {
        if (!audio) return;
        audio.pause();
        isPlaying = false;
        updatePlayPauseUI();
    }

    function togglePlay() {
        if (!started) {
            startPresentation();
            return;
        }
        if (isPlaying) pauseAudio();
        else playAudio();
    }

    function updatePlayPauseUI() {
        if (isPlaying) {
            playPauseBtn.textContent = '⏸';
        } else {
            playPauseBtn.textContent = '▶';
        }
    }

    // ─── Audio event handlers ────────────────────────
    function onAudioEnded() {
        // Mark current dot as completed
        if (dots[currentSection]) {
            dots[currentSection].classList.add('completed');
        }

        clearAllHighlights();

        if (currentSection < SECTION_COUNT - 1) {
            // Move to next section
            goToSection(currentSection + 1);
        } else {
            // Finished all sections
            isPlaying = false;
            updatePlayPauseUI();
        }
    }

    function onTimeUpdate() {
        if (isSeeking || !audio) return;
        const pct = (audio.currentTime / audio.duration) * 100 || 0;
        if (progressBar) progressBar.value = pct;
        if (progressFill) progressFill.style.width = pct + '%';
        currentTimeEl.textContent = formatTime(audio.currentTime);

        // Update card highlighting based on current time
        updateHighlighting(currentSection, audio.currentTime);
    }

    function onMetaLoaded() {
        totalTimeEl.textContent = formatTime(audio.duration);
    }

    // ─── Section navigation ─────────────────────────
    function goToSection(index) {
        if (index < 0 || index >= SECTION_COUNT) return;
        loadAudio(index);
        scrollToSection(index);
        // Small delay so scroll is underway before audio starts
        setTimeout(() => playAudio(), 600);
    }

    function startPresentation() {
        started = true;
        playbar.classList.add('active');
        enterFullscreen();
        // Wait for fullscreen transition to complete before scrolling
        setTimeout(() => goToSection(0), 800);
    }

    // ─── Dots navigation ────────────────────────────
    function updateDots() {
        dots.forEach((d, i) => {
            d.classList.toggle('active', i === currentSection);
        });
    }

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const idx = parseInt(dot.dataset.section, 10) - 1;
            goToSection(idx);
        });
    });

    // ─── Progress bar seek ──────────────────────────
    if (progressBar) {
        progressBar.addEventListener('input', (e) => {
            if (!audio || !audio.duration) return;
            isSeeking = true;
            const pct = parseFloat(e.target.value);
            if (progressFill) progressFill.style.width = pct + '%';
            currentTimeEl.textContent = formatTime((pct / 100) * audio.duration);
        });

        progressBar.addEventListener('change', (e) => {
            if (!audio || !audio.duration) return;
            isSeeking = false;
            const pct = parseFloat(e.target.value);
            audio.currentTime = (pct / 100) * audio.duration;
        });
    }

    // ─── Volume slider ──────────────────────────────
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            if (audio) audio.volume = e.target.value;
        });
    }

    // ─── Play/Pause button ──────────────────────────
    playPauseBtn.addEventListener('click', togglePlay);

    // ─── Prev / Next buttons ────────────────────────
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentSection > 0) goToSection(currentSection - 1);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentSection < SECTION_COUNT - 1) goToSection(currentSection + 1);
        });
    }

    // ─── Start button ───────────────────────────────
    startBtn.addEventListener('click', startPresentation);

    // ─── Visibility animation for sections ──────────
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.15 });

    sections.forEach(s => observer.observe(s));

    // ─── Keyboard shortcuts ─────────────────────────
    document.addEventListener('keydown', (e) => {
        if (!started) return;
        switch (e.key) {
            case ' ':
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowRight':
                if (currentSection < SECTION_COUNT - 1) goToSection(currentSection + 1);
                break;
            case 'ArrowLeft':
                if (currentSection > 0) goToSection(currentSection - 1);
                break;
        }
    });

    // ============================================================
    //  AUDIO-SYNCED CARD HIGHLIGHTING
    // ============================================================

    // Highlight timing definitions per section (0-indexed)
    // Each entry: { start: seconds, end: seconds, cardIndex: number }
    // cardIndex refers to the nth card/element in that section

    const highlightTimings = {
        // Section 1 (index 0): info-cards
        0: [
            { start: 0,  end: 8,   cardIndex: 0 },   // Croissance rapide des centres de données liés à l'IA
            { start: 9,  end: 33,  cardIndex: 1 },   // Électricité : calcul intensif avec GPU
            { start: 34, end: 50,  cardIndex: 2 },   // Eau : refroidissement massif des serveurs
            { start: 51, end: 65,  cardIndex: 3 },   // Fonctionnement continu 24/7
            { start: 66, end: 80,  cardIndex: 4 },   // Forte centralisation des infrastructures
            { start: 81, end: 85,  cardIndex: 5 },   // Enjeux sociaux et économiques
            { start: 86, end: 94,  cardIndex: 6 },   // Pénuries locales de ressources
            { start: 95, end: 101, cardIndex: 7 },   // Conditions d'extraction des minerais
            { start: 101, end: 105, cardIndex: 8 },  // Empreinte environnementale accrue
        ],
        // Section 2 (index 1): text-blocks
        1: [
            { start: 0,  end: 43,  cardIndex: 0 },   // Calculs intensifs
            { start: 44, end: 62,  cardIndex: 1 },   // Refroidissements massifs
            { start: 62, end: 74,  cardIndex: 2 },   // Fonctionnement 24/7
            { start: 74, end: 89,  cardIndex: 3 },   // Centralisation
        ],
        // Section 3 (index 2): bio-cards
        2: [
            { start: 6,  end: 22,  cardIndex: 0 },   // Stimulus Aléatoire
            { start: 23, end: 29,  cardIndex: 1 },   // Biomimétisme
            { start: 29, end: 45,  cardIndex: 2 },   // Mind map
        ],
        // Section 4 (index 3): bio-cards (row 1 + row 2)
        3: [
            { start: 15, end: 34,  cardIndex: 0 },   // Horizon
            { start: 35, end: 50,  cardIndex: 1 },   // Éclipse
            { start: 51, end: 75,  cardIndex: 2 },   // Fragment
            { start: 76, end: 99,  cardIndex: 3, autoScroll: true },  // Cascade (auto-scroll at 1:16)
            { start: 100, end: 133, cardIndex: 4 },  // Urgences
        ],
        // Section 5 (index 4): bio-cards
        4: [
            { start: 20, end: 46,  cardIndex: 0 },   // Racine d'arbres
            { start: 47, end: 76,  cardIndex: 1 },   // Colonie de fourmis
            { start: 76, end: 106, cardIndex: 2 },   // Migration d'oiseaux
        ],
        // Section 6 (index 5): mindmap image (full audio)
        5: [
            { start: 0,  end: 9999, cardIndex: 0 },  // Mindmap image – whole audio
        ],
        // Section 7 (index 6): meta-cards + meta-learnings
        6: [
            { start: 0,  end: 24,  cardIndex: 0 },   // Déclic initial
            { start: 25, end: 67,  cardIndex: 1 },   // Sortir du cadre
            { start: 68, end: 109, cardIndex: 2 },   // Associations éloignées
            { start: 110, end: 137, cardIndex: 3 },  // Synthèse et ancrage
            { start: 138, end: 187, cardIndex: 4 },  // Ce que nous retenons
        ],
    };

    function getHighlightableElements(sectionIndex) {
        const section = sections[sectionIndex];
        if (!section) return [];

        switch (sectionIndex) {
            case 0: // Section 1: info-cards
                return section.querySelectorAll('.info-card');
            case 1: // Section 2: text-blocks
                return section.querySelectorAll('.text-block');
            case 2: // Section 3: bio-cards
                return section.querySelectorAll('.bio-card');
            case 3: // Section 4: bio-cards from both grids
                return section.querySelectorAll('.bio-card');
            case 4: // Section 5: bio-cards
                return section.querySelectorAll('.bio-card');
            case 5: // Section 6: the image-gallery div
                return section.querySelectorAll('.image-gallery');
            case 6: // Section 7: meta-cards + meta-learnings
                const metaCards = Array.from(section.querySelectorAll('.meta-card'));
                const metaLearnings = Array.from(section.querySelectorAll('.meta-learnings'));
                return [...metaCards, ...metaLearnings];
            default:
                return [];
        }
    }

    function clearAllHighlights() {
        document.querySelectorAll('.audio-highlight').forEach(el => {
            el.classList.remove('audio-highlight');
        });
    }

    function updateHighlighting(sectionIndex, time) {
        const timings = highlightTimings[sectionIndex];
        if (!timings) return;

        const elements = getHighlightableElements(sectionIndex);
        if (!elements || elements.length === 0) return;

        // Find which card should be highlighted
        let activeCardIndex = -1;
        for (const timing of timings) {
            if (time >= timing.start && time < timing.end) {
                activeCardIndex = timing.cardIndex;
                break;
            }
        }

        // Section 4 auto-scroll at 1:16 (76 seconds)
        if (sectionIndex === 3 && time >= 76 && !section4Scrolled) {
            section4Scrolled = true;
            const section4 = sections[3];
            if (section4) {
                const secondGrid = section4.querySelectorAll('.bio-grid')[1];
                if (secondGrid) {
                    secondGrid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }

        // Section 7 auto-scroll at 2:18 (138 seconds)
        if (sectionIndex === 6 && time >= 138 && !section7Scrolled) {
            section7Scrolled = true;
            const section7 = sections[6];
            if (section7) {
                const learnings = section7.querySelector('.meta-learnings');
                if (learnings) {
                    learnings.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }

        // Apply highlight - only 1 card at a time
        elements.forEach((el, idx) => {
            if (idx === activeCardIndex) {
                if (!el.classList.contains('audio-highlight')) {
                    el.classList.add('audio-highlight');
                }
            } else {
                el.classList.remove('audio-highlight');
            }
        });
    }

})();
