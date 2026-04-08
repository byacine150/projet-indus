/* ============================================
   PIXEL ART WEBSITE – JAVASCRIPT
   Audio Engine · Playbar · Auto-Scroll
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
        updateDots();
        sectionLabel.textContent = index + 1;
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
        goToSection(0);
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

})();
